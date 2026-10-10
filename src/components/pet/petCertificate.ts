import { PET_SPECIES, PET_STAGES, type PetSpecies } from "./PetArt";

interface CertificateData {
  /** o <svg> do bichinho já desenhado na tela */
  svgMarkup: string;
  petName: string;
  species: PetSpecies;
  stage: number;
  familyName: string;
  roomNumber: string;
  adoptedAt: string;
  checkins: number;
  ratings: number;
  games: number;
}

const loadSvg = (svg: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Desenha a Certidão de Adoção (1080×1350) e devolve um PNG */
export const buildCertificate = async (d: CertificateData): Promise<Blob> => {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await document.fonts?.load?.("800 60px 'Baloo 2'").catch(() => undefined);
  const display = "'Baloo 2', system-ui, sans-serif";
  const body = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const INK = "#3B2A1A";

  // céu e pasto
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#CFEAF7");
  sky.addColorStop(0.62, "#EAF6FB");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#9BCB5B";
  ctx.beginPath();
  ctx.moveTo(0, 820);
  ctx.quadraticCurveTo(W / 2, 740, W, 820);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();

  // cerca
  ctx.fillStyle = "#A0673B";
  for (let x = 40; x < W; x += 120) roundRect(ctx, x, 760, 26, 120, 6), ctx.fill();
  roundRect(ctx, 0, 790, W, 18, 6);
  ctx.fill();
  roundRect(ctx, 0, 836, W, 18, 6);
  ctx.fill();

  // moldura
  ctx.strokeStyle = "#A0673B";
  ctx.lineWidth = 14;
  roundRect(ctx, 28, 28, W - 56, H - 56, 36);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `800 70px ${display}`;
  ctx.fillText("Certidão de Adoção", W / 2, 140);
  ctx.font = `500 30px ${body}`;
  ctx.fillText("Hotel Fazenda Santa Bárbara", W / 2, 190);

  // bichinho
  const svg = d.svgMarkup.includes("xmlns=")
    ? d.svgMarkup
    : d.svgMarkup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const img = await loadSvg(svg);
  ctx.drawImage(img, W / 2 - 280, 230, 560, 560);

  // placa de madeira com o nome
  ctx.fillStyle = "#C98B57";
  roundRect(ctx, W / 2 - 300, 860, 600, 120, 24);
  ctx.fill();
  ctx.fillStyle = "#FFF8EC";
  ctx.font = `800 76px ${display}`;
  ctx.fillText(d.petName, W / 2, 945, 560);

  const speciesLabel = PET_SPECIES.find((s) => s.id === d.species)?.label ?? "";
  const stageName = PET_STAGES[d.stage]?.name ?? "";
  ctx.fillStyle = INK;
  ctx.font = `600 36px ${body}`;
  ctx.fillText(`${speciesLabel} · ${stageName}`, W / 2, 1040);

  ctx.font = `500 32px ${body}`;
  ctx.fillText(`Adotado pela família ${d.familyName}, apto ${d.roomNumber}`, W / 2, 1100, W - 120);
  const adopted = new Date(d.adoptedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  ctx.fillText(`em ${adopted}`, W / 2, 1145);

  const facts = [
    d.checkins ? `${d.checkins} ${d.checkins === 1 ? "atividade" : "atividades"}` : null,
    d.ratings ? `${d.ratings} ${d.ratings === 1 ? "avaliação" : "avaliações"}` : null,
    d.games ? `${d.games} ${d.games === 1 ? "jogo" : "jogos"}` : null,
  ].filter(Boolean);
  if (facts.length) {
    ctx.font = `500 28px ${body}`;
    ctx.fillText(`Juntos: ${facts.join(", ")}`, W / 2, 1200, W - 120);
  }

  ctx.font = `800 34px ${display}`;
  ctx.fillText(`${d.petName} vai esperar você voltar! 💚`, W / 2, 1270, W - 120);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
};

/** Compartilha (celular) ou baixa a certidão */
export const shareOrDownloadCertificate = async (d: CertificateData) => {
  const blob = await buildCertificate(d);
  const fileName = `certidao-${d.petName.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.png`;
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `Certidão de Adoção – ${d.petName}` });
      return;
    } catch {
      /* cancelado: cai no download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
