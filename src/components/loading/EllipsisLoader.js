import Image from "next/image";

/**
 * Pantalla de carga centrada con identidad visual clara de ADAMIA.
 */
export default function EllipsisLoader({ message = "" }) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center gap-2 bg-white px-6 text-[var(--adamia-blue)]">
      <Image
        alt="ADAMIA"
        src="/assets/adamia.png"
        height={44}
        width={140}
        className="h-9 w-auto object-contain opacity-95"
        priority
      />
      <div className="lds-ellipsis" aria-hidden="true">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      {message ? (
        <p className="text-sm font-medium text-[var(--adamia-text-secondary)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
