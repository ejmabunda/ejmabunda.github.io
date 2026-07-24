import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import SectionDivider from "@/components/ui/SectionDivider";
import Hero from "@/components/sections/Hero";
import Skills from "@/components/sections/Skills";
import Experience from "@/components/sections/Experience";
import Education from "@/components/sections/Education";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <SectionDivider />
      <Skills />
      <SectionDivider />
      <Experience />
      <SectionDivider />
      <Education />
      <Footer />
    </>
  );
}
