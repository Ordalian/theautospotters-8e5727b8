import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push crypto helpers
async function importVapidKeys(publicKeyBase64url: string, privateKeyBase64url: string) {
  const publicKeyRaw = base64urlToBuffer(publicKeyBase64url);
  const privateKeyRaw = base64urlToBuffer(privateKeyBase64url);

  const publicKey = await crypto.subtle.importKey(
    "raw",
    publicKeyRaw.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    []
  );
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    wrapP256PrivateKey(privateKeyRaw),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
  return { publicKey, privateKey, publicKeyRaw };
}

function wrapP256PrivateKey(rawKey: Uint8Array): ArrayBuffer {
  // Wrap a 32-byte raw private key into PKCS#8 DER for P-256
  const header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  // We skip the public key in the PKCS#8 wrapper for signing purposes
  // Simpler approach: just use raw concat
  const result = new Uint8Array(header.length + rawKey.length);
  result.set(header);
  result.set(rawKey, header.length);
  return result.buffer;
}

function base64urlToBuffer(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJWT(
  audience: string,
  subject: string,
  privateKey: CryptoKey
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = bufferToBase64url(new TextEncoder().encode(JSON.stringify(header)).buffer as ArrayBuffer);
  const payloadB64 = bufferToBase64url(new TextEncoder().encode(JSON.stringify(payload)).buffer as ArrayBuffer);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  if (sigBytes[0] === 0x30) {
    // DER encoded
    const rLen = sigBytes[3];
    const rStart = 4;
    r = sigBytes.slice(rStart, rStart + rLen);
    const sLen = sigBytes[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    s = sigBytes.slice(sStart, sStart + sLen);
    // Trim leading zeros
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    // Pad to 32 bytes
    if (r.length < 32) { const tmp = new Uint8Array(32); tmp.set(r, 32 - r.length); r = tmp; }
    if (s.length < 32) { const tmp = new Uint8Array(32); tmp.set(s, 32 - s.length); s = tmp; }
    const rawSig = new Uint8Array(64);
    rawSig.set(r, 0);
    rawSig.set(s, 32);
    return `${unsignedToken}.${bufferToBase64url(rawSig.buffer)}`;
  }

  return `${unsignedToken}.${bufferToBase64url(signature)}`;
}

// Encrypt payload using Web Push encryption (aes128gcm)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: ArrayBuffer; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const localKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeys.publicKey)
  );

  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    base64urlToBuffer(p256dhKey).buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeys.privateKey,
    256
  );

  const authSecretBytes = base64urlToBuffer(authSecret);

  // HKDF to derive the content encryption key
  const ikm = new Uint8Array(sharedSecret);
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const subscriberKeyRaw = base64urlToBuffer(p256dhKey);

  const authInfoFull = new Uint8Array(authInfo.length + subscriberKeyRaw.length + localPublicKeyRaw.length);
  authInfoFull.set(authInfo);
  authInfoFull.set(subscriberKeyRaw, authInfo.length);
  authInfoFull.set(localPublicKeyRaw, authInfo.length + subscriberKeyRaw.length);

  // PRK = HKDF-Extract(auth_secret, shared_secret)
  const prkKey = await crypto.subtle.importKey("raw", authSecretBytes.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, ikm));

  // IKM for content = HKDF-Expand(PRK, auth_info, 32)
  const prkKey2 = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const ikmExpand = new Uint8Array(authInfoFull.length + 1);
  ikmExpand.set(authInfoFull);
  ikmExpand[authInfoFull.length] = 1;
  const ikm2 = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey2, ikmExpand));

  // CEK info and nonce info
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const ikm2Key = await crypto.subtle.importKey("raw", ikm2.slice(0, 32), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  // CEK = HKDF-Expand(ikm2, salt || cek_info, 16)
  const cekInput = new Uint8Array(salt.length + cekInfo.length + 1);
  cekInput.set(salt);
  cekInput.set(cekInfo, salt.length);
  cekInput[cekInput.length - 1] = 1;
  const cekFull = new Uint8Array(await crypto.subtle.sign("HMAC", ikm2Key, cekInput));
  const cek = cekFull.slice(0, 16);

  // Nonce = HKDF-Expand(ikm2, salt || nonce_info, 12)
  const nonceInput = new Uint8Array(salt.length + nonceInfo.length + 1);
  nonceInput.set(salt);
  nonceInput.set(nonceInfo, salt.length);
  nonceInput[nonceInput.length - 1] = 1;
  const nonceFull = new Uint8Array(await crypto.subtle.sign("HMAC", ikm2Key, nonceInput));
  const nonce = nonceFull.slice(0, 12);

  // Encrypt with AES-128-GCM
  const contentKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const payloadBytes = new TextEncoder().encode(payload);
  // Add padding delimiter
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  const encryptedContent = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    contentKey,
    paddedPayload
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  const result = new Uint8Array(header.length + encryptedContent.byteLength);
  result.set(header);
  result.set(new Uint8Array(encryptedContent), header.length);

  return { encrypted: result.buffer, salt, localPublicKey: localPublicKeyRaw };
}

function getNotificationContent(type: string, data: Record<string, any>): { title: string; body: string; url: string; tag: string } {
  switch (type) {
    case "friend_request":
      return {
        title: "Demande d'ami",
        body: `${data.requester_username || "Quelqu'un"} veut être ton ami !`,
        url: "/profile/settings",
        tag: "friend_request",
      };
    case "friend_accepted":
      return {
        title: "Ami accepté !",
        body: `${data.accepter_username || "Quelqu'un"} a accepté ta demande`,
        url: "/friends",
        tag: "friend_accepted",
      };
    case "dm_received":
      return {
        title: `Message de ${data.sender_username || "Quelqu'un"}`,
        body: data.message_preview || "Nouveau message",
        url: "/messaging",
        tag: `dm_${data.sender_id}`,
      };
    case "group_message":
      return {
        title: data.chat_title || "Message de groupe",
        body: `${data.sender_username || "Quelqu'un"}: ${data.message_preview || ""}`,
        url: "/messaging",
        tag: `group_${data.chat_id}`,
      };
    case "friend_spot":
      return {
        title: "Nouveau spot !",
        body: `${data.spotter_username || "Un ami"} a spotté une ${data.brand} ${data.model}`,
        url: data.car_id ? `/car/${data.car_id}` : "/friends",
        tag: "friend_spot",
      };
    case "vehicle_delivered":
      return {
        title: "Véhicule reçu !",
        body: `${data.deliverer_username || "Un ami"} t'a envoyé une ${data.brand} ${data.model}`,
        url: data.car_id ? `/car/${data.car_id}` : "/garage",
        tag: "vehicle_delivered",
      };
    case "topic_reply":
      return {
        title: "Réponse sur un sujet",
        body: `${data.replier_username || "Quelqu'un"} a répondu à "${data.topic_title || "un sujet"}"`,
        url: "/messaging",
        tag: `topic_${data.topic_id}`,
      };
    case "car_like":
      return {
        title: "Like sur ton spot !",
        body: `${data.liker_username || "Quelqu'un"} a aimé ta ${data.brand} ${data.model}`,
        url: data.car_id ? `/car/${data.car_id}` : "/garage",
        tag: "car_like",
      };
    case "vehicle_spotted":
      return {
        title: "Ton véhicule a été spotté !",
        body: `${data.brand} ${data.model} ${data.year || ""}`,
        url: data.spotted_car_id ? `/car/${data.spotted_car_id}` : "/home",
        tag: "vehicle_spotted",
      };
    default:
      return {
        title: "Autospotter",
        body: "Nouvelle notification",
        url: "/home",
        tag: "default",
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Called by database webhook: body.record contains the notification row
    const record = body.record || body;
    const userId = record.user_id;
    const notifType = record.type;
    const notifData = typeof record.data === "string" ? JSON.parse(record.data) : record.data || {};

    if (!userId) {
      return new Response(JSON.stringify({ error: "no user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all push subscriptions for this user
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@autospotter.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = getNotificationContent(notifType, notifData);
    const payloadStr = JSON.stringify(content);

    let sent = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const endpointUrl = new URL(sub.endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

        const { privateKey } = await importVapidKeys(vapidPublicKey, vapidPrivateKey);
        const jwt = await createJWT(audience, vapidSubject, privateKey);

        const { encrypted } = await encryptPayload(payloadStr, sub.p256dh, sub.auth_key);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
            TTL: "86400",
            Urgency: "normal",
          },
          body: encrypted,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 404 || response.status === 410) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.error(`Push failed for ${sub.endpoint}: ${response.status}`);
        }
      } catch (err) {
        console.error(`Push error for ${sub.endpoint}:`, err);
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .in("endpoint", staleEndpoints);
    }

    return new Response(JSON.stringify({ ok: true, sent, stale: staleEndpoints.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push-notification error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
