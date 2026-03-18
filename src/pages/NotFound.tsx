import { useLanguage } from "@/i18n/LanguageContext";

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t.not_found_title as string}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t.not_found_desc as string}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t.not_found_link as string}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
