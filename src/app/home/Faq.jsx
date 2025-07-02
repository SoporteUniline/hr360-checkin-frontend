import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Icon } from "@iconify/react";

export default function Faq() {
  return (
    <div className="w-full bg-gray-100">
      <div className="p-5 py-10 md:px-10 lg:px-30 xl:px-40">
        <h3 className="text-center text-2xl font-extrabold text-slate-700">
          Preguntas Frecuentes
        </h3>
        <div className="mt-5">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                ¿Puedo cambiar de plan después?
              </AccordionTrigger>
              <AccordionContent>
                Yes. It adheres to the WAI-ARIA design pattern.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>¿Ofrecen soporte dedicado?</AccordionTrigger>
              <AccordionContent>
                Yes. It comes with default styles that matches the other
                components&apos; aesthetic.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>
                ¿Cómo puedo invitar a otros usuarios de mi organización?
              </AccordionTrigger>
              <AccordionContent>
                Yes. It's animated by default, but you can disable it if you
                prefer.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <h3 className="text-center text-2xl font-extrabold text-slate-700 pt-10">
          Estamos en tu País
        </h3>
        <div className="mt-5 flex gap-2 md:gap-10 justify-center pb-5">
          <div>
            <div className="flex justify-center">
              <Icon icon="emojione-v1:flag-for-spain" width="64" height="64" />
            </div>
            <p className="text-gray-600 text-center text-sm">España</p>
          </div>
          <div>
            <div className="flex justify-center">
              <Icon
                icon="emojione-v1:flag-for-colombia"
                width="64"
                height="64"
              />
            </div>
            <p className="text-gray-600 text-center text-sm">Colombia</p>
          </div>
          <div>
            <div className="flex justify-center">
              <Icon icon="emojione-v1:flag-for-peru" width="64" height="64" />
            </div>
            <p className="text-gray-600 text-center text-sm">Peru</p>
          </div>
          <div>
            <div className="flex justify-center">
              <Icon icon="emojione-v1:flag-for-chile" width="64" height="64" />
            </div>
            <p className="text-gray-600 text-center text-sm">Chile</p>
          </div>
          <div>
            <div className="flex justify-center">
              <Icon icon="emojione-v1:flag-for-mexico" width="64" height="64" />
            </div>
            <p className="text-gray-600 text-center text-sm">México</p>
          </div>
        </div>
      </div>
    </div>
  );
}
