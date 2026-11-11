import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[80svh] items-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0 bg-lines" />
      <div className="wrap relative">
        <p className="label-mono">Erro 404</p>
        <h1 className="mt-4 font-display text-[clamp(4rem,14vw,12rem)] font-black uppercase leading-[0.8] text-white">
          Fora do <span className="grad-text">mapa.</span>
        </h1>
        <p className="mt-6 max-w-md text-gray">Essa página não existe, ou mudou de lane.</p>
        <div className="mt-10">
          <ButtonLink href="/">Voltar para a base</ButtonLink>
        </div>
      </div>
    </section>
  );
}
