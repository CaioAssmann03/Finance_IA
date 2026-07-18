const sharp = require("sharp");
const path = require("path");

const OUT = path.join(__dirname, "..", "public", "icons");

async function gerar() {
  const fonte = path.join(__dirname, "icon-source.svg");
  const fonteMaskable = path.join(__dirname, "icon-maskable-source.svg");

  const tamanhos = [192, 256, 384, 512];
  for (const tamanho of tamanhos) {
    await sharp(fonte)
      .resize(tamanho, tamanho)
      .png()
      .toFile(path.join(OUT, `icon-${tamanho}.png`));
    console.log(`icon-${tamanho}.png ok`);
  }

  await sharp(fonteMaskable)
    .resize(512, 512)
    .png()
    .toFile(path.join(OUT, "icon-maskable-512.png"));
  console.log("icon-maskable-512.png ok");

  // Apple touch icon (180x180, sem transparência, iOS ignora bordas arredondadas do arquivo)
  await sharp(fonte)
    .resize(180, 180)
    .flatten({ background: "#0F211A" })
    .png()
    .toFile(path.join(OUT, "apple-touch-icon.png"));
  console.log("apple-touch-icon.png ok");

  // Favicon simples
  await sharp(fonte).resize(32, 32).png().toFile(path.join(OUT, "favicon-32.png"));
  console.log("favicon-32.png ok");
}

gerar().catch((e) => {
  console.error(e);
  process.exit(1);
});
