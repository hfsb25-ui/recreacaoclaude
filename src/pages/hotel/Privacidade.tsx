import { HotelLayout, HotelPageHeader, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { useHotelInfo, linkWhatsapp, formatarWhatsapp } from "@/hooks/useHotelInfo";

const ATUALIZADA_EM = "23 de outubro de 2026";

const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-lg font-extrabold" style={FONTE_TITULO}>
      {titulo}
    </h2>
    <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-[#3D4A41]">{children}</div>
  </section>
);

/** Política de privacidade do app (exigida pela Play Store e pela LGPD). */
const Privacidade = () => {
  const info = useHotelInfo();
  return (
    <HotelLayout>
      <HotelPageHeader title="Privacidade" subtitle={`Atualizada em ${ATUALIZADA_EM}`} back="/hotel" />
      <main className="m-5 flex flex-col gap-6 rounded-[20px] bg-white p-5 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
        <p className="text-[15px] leading-relaxed text-[#3D4A41]">
          Este é o app do <b>Hotel Fazenda Santa Bárbara</b> (Engenheiro Paulo de Frontin, RJ). Aqui explicamos, de forma
          simples, quais dados o app usa, para quê e como você pode pedir para vê-los ou apagá-los, conforme a Lei Geral de
          Proteção de Dados (LGPD).
        </p>

        <Secao titulo="Quais dados usamos">
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              <b>Para entrar no app:</b> número do apartamento e sobrenome, conferidos com a reserva no sistema do hotel.
            </li>
            <li>
              <b>Da sua reserva:</b> nome do titular, datas de entrada e saída, número de adultos e crianças e, quando
              informado no check-in, o telefone do titular.
            </li>
            <li>
              <b>Da recreação:</b> check-ins nas atividades, avaliações, pontos do ranking, jogos e o seu bichinho virtual.
            </li>
            <li>
              <b>Consumo:</b> os lançamentos do seu apartamento, que só você vê depois de entrar com o apartamento.
            </li>
            <li>
              <b>Notificações:</b> se você ativar os avisos, guardamos o endereço de envio do seu aparelho para mandar
              novidades e promoções do hotel, inclusive depois da estadia. Dá para desligar quando quiser nas configurações
              do celular.
            </li>
            <li>
              <b>Uso do app:</b> contamos quantas visitas cada página recebe, sem identificar quem visitou.
            </li>
          </ul>
        </Secao>

        <Secao titulo="Para que usamos">
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>Mostrar a programação, o ranking e as informações da sua estadia.</li>
            <li>Enviar lembretes de atividades pelo WhatsApp, quando você pede.</li>
            <li>Melhorar a recreação a partir das avaliações.</li>
            <li>Manter contato depois da estadia com novidades do hotel. Você pode pedir para sair a qualquer momento.</li>
          </ul>
        </Secao>

        <Secao titulo="Com quem compartilhamos">
          <p>
            Não vendemos nem cedemos seus dados. Eles ficam guardados em serviços de hospedagem contratados pelo hotel
            (banco de dados e site na nuvem), que só os processam para o app funcionar. Mensagens são enviadas pelo
            WhatsApp.
          </p>
        </Secao>

        <Secao titulo="Por quanto tempo guardamos">
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>Os dados da reserva no app são apagados depois do check-out.</li>
            <li>O cadastro da recreação é apagado quando o ranking da semana fecha. Ficam só números gerais, sem nomes.</li>
            <li>O contato do titular da reserva fica guardado até você pedir para remover.</li>
          </ul>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            Você pode pedir para ver, corrigir ou apagar seus dados, ou para não receber mais mensagens. Fale com a recepção
            ou pelo WhatsApp do hotel
            {info.whatsapp ? (
              <>
                {" "}
                <a className="font-bold text-[#1F4D3A] underline" href={linkWhatsapp(info)} target="_blank" rel="noopener noreferrer">
                  {formatarWhatsapp(info.whatsapp)}
                </a>
              </>
            ) : null}
            .
          </p>
        </Secao>
      </main>
    </HotelLayout>
  );
};

export default Privacidade;
