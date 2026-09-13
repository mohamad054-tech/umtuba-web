type LegalTranslationDisclaimerProps = {
  locale: string;
  message: string;
};

export default function LegalTranslationDisclaimer({
  locale,
  message,
}: LegalTranslationDisclaimerProps) {
  if (locale === "en") {
    return null;
  }

  return (
    <p className="mt-4 text-sm leading-6 text-white/50" role="note">
      {message}
    </p>
  );
}
