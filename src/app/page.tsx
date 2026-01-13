import Image from "next/image";

import { FaLinkedin, FaGithub } from "react-icons/fa";

const projects = [
  {
    "name": "UnoCLI",
    "description": "A console-based implementation of the classic Uno board game, built with Apache Maven.",
    "link": "https://www.github.com/ejmabunda/uno-cli",
    "status": "in dev",
  },
  {
    "name": "AKH website",
    "description": "A website built for an electrical wholesaler and projects company, based in Midrand.",
    "link": "https://www.amoskatlego.com",
    "status": "done",
  },
];

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
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
          <p className="mb-2 tracking-[-.01em]">Hi, I am Junior Mabunda.. an aspiring Software Engineer.</p>
          <p className="tracking-[-.01em]">
            Intent on building useful, high-quality applications. Experienced in modern web technologies, and currently exploring backend development.
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

        {/* Projects section */}
        <section className="">
          <h2 className="text-2xl font-bold mb-4">Projects</h2>
          <div className="flex flex-col gap-6 lg:flex-row">
            {projects.map(project => (
              <div key={project.name}>
                <div className="flex gap-3">
                  <h3 className="font-bold">{project.name}</h3>
                  <span className={`${project.status === "in dev" ? "bg-yellow-500" : "bg-green-500"} px-3 rounded-full font-mono`}>{project.status}</span>
                </div>
                <p className="mb-3 font-mono">{project.description}</p>
                <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded text-right">
                  <a href={project.link} target="_blank" className="mt-4">View Project</a>
                </code>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
