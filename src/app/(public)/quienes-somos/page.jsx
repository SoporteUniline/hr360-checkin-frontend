import Faq from "@/app/home/Faq";
import Main from "@/app/home/Main";
import Rating from "@/app/home/Rating";

export default function QuienesSomos() {
  return (
    <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
      <Main />
      <Rating />
      <Faq />
    </main>
  );
}
