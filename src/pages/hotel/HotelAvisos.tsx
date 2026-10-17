import { useEffect, useState } from "react";
import { MascoteAvatar } from "@/components/hotel/Mascote";
import { supabase } from "@/integrations/supabase/client";
import { HotelLayout, HotelPageHeader, FONTE_TITULO } from "@/components/hotel/HotelLayout";

interface Aviso {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_url: string | null;
}

const imagem = (path: string | null) =>
  path ? supabase.storage.from("announcements").getPublicUrl(path).data.publicUrl : null;

/** Avisos do hotel — usa os mesmos avisos cadastrados hoje no painel. */
const HotelAvisos = () => {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);

  useEffect(() => {
    supabase
      .from("announcements")
      .select("id, title, description, image_url, button_text, button_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setAvisos((data as Aviso[]) ?? []));
  }, []);

  return (
    <HotelLayout>
      <HotelPageHeader title="Avisos" />
      <main className="flex flex-col gap-3.5 p-5">
        {avisos === null && <p className="text-center text-[#5B6B60]">Carregando…</p>}
        {avisos?.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-[18px] bg-white p-6 text-center text-[#5B6B60]">
            <MascoteAvatar size={88} className="ring-[#F4F6F0]" />
            <p className="font-bold">Nenhum aviso no momento.</p>
            <p className="text-sm">Quando tiver novidade no hotel, ela aparece aqui.</p>
          </div>
        )}
        {avisos?.map((a) => {
          const img = imagem(a.image_url);
          const externo = a.button_url?.startsWith("http");
          return (
            <article key={a.id} className="overflow-hidden rounded-[18px] bg-white shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
              {img && <img src={img} alt="" className="h-40 w-full object-cover" />}
              <div className="flex flex-col gap-1.5 p-4">
                <h2 className="text-[19px] font-bold leading-tight" style={FONTE_TITULO}>
                  {a.title}
                </h2>
                {a.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#3D4A41]">{a.description}</p>}
                {a.button_url && a.button_text && (
                  <a
                    href={a.button_url}
                    target={externo ? "_blank" : undefined}
                    rel={externo ? "noopener noreferrer" : undefined}
                    className="mt-2 flex min-h-[44px] items-center justify-center rounded-xl bg-[#1F4D3A] px-4 font-extrabold text-white"
                  >
                    {a.button_text}
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </main>
    </HotelLayout>
  );
};

export default HotelAvisos;
