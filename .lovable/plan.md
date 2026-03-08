

## Add password visibility toggle to Auth page

Add a show/hide password toggle button (eye icon) to the password input field on the login/signup form in `src/pages/Auth.tsx`.

### Changes

**`src/pages/Auth.tsx`**:
- Import `Eye` and `EyeOff` from `lucide-react`
- Add a `showPassword` boolean state
- Wrap the password `<Input>` in a `relative` div
- Toggle input `type` between `"password"` and `"text"` based on state
- Add an absolute-positioned icon button (Eye/EyeOff) at the right end of the input

