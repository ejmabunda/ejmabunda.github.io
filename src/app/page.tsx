import Image from "next/image";

import { FaLinkedin, FaGithub } from "react-icons/fa";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-0 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="rounded-full"
          src="/pfp.png"
          alt="Picture fo the author"
          width={150}
          height={150}
          priority
        />
        <h1 className="text-3xl font-bold">Junior_</h1>
        <section className="font-mono text-sm/6 text-center sm:text-left">
          <p className="mb-2 tracking-[-.01em]">Hi, I am Junior Mabunda.. a Junior Developer.</p>
          <p className="tracking-[-.01em]">
            Interested in clean architecture, system integration, and building scalable web applications.
          </p>
        </section>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://www.linkedin.com/in/ejmabunda"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin className="text-2xl" />
            <span >LinkedIn</span>
          </a>

          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://www.github.com/ejmabunda"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub className="text-2xl" />
            <span>GitHub</span>
          </a>
        </div>
      </main>
    </div>
  );
}
