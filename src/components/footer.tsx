export function Footer() {
  return (
    <footer className="relative bg-primary w-full mt-auto min-h-10 sm:min-h-14 xl:min-h-[72px] overflow-hidden">
      <img
        src="/epulet.png"
        alt="Könyves Kálmán Gimnázium"
        width={162}
        height={72}
        className="absolute left-0 bottom-0 m-0 block h-10 w-auto sm:h-14 xl:h-[72px] max-w-none pointer-events-none select-none mix-blend-screen"
      />
      <div className="relative z-10 flex justify-end items-center w-full pr-margin-page py-stack-md mx-auto max-w-7xl min-h-10 sm:min-h-14 xl:min-h-[72px] pl-24 sm:pl-36 xl:pl-44">
        <span className="font-body-md text-xs sm:text-body-md text-on-primary text-right text-pretty leading-snug">
          © {new Date().getFullYear()} Könyves Kálmán Gimnázium. Minden jog fenntartva.
        </span>
      </div>
    </footer>
  );
}
