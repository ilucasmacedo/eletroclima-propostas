import logoUrl from './assets/logo-eletroclima.svg?url';
import logoSidebarUrl from './assets/logo-eletroclima-sidebar.svg?url';
import logoSvgRaw from './assets/logo-eletroclima.svg?raw';
import logoSidebarSvgRaw from './assets/logo-eletroclima-sidebar.svg?raw';

/** html2canvas não aplica &lt;style&gt; interno do SVG — converte classes em fill inline */
function prepareSvgForCanvas(svgRaw) {
  if (!svgRaw) return '';

  const fills = {};
  const classRegex = /\.cls-(\d+)\s*\{\s*fill:\s*(#[0-9a-fA-F]{3,8})\s*;?\s*\}/g;
  let match;
  while ((match = classRegex.exec(svgRaw)) !== null) {
    fills[`cls-${match[1]}`] = match[2];
  }

  let out = svgRaw.replace(/<defs>[\s\S]*?<\/defs>\s*/i, '');

  for (const [className, color] of Object.entries(fills)) {
    const attr = `class="${className}"`;
    out = out.split(attr).join(`fill="${color}"`);
  }

  return out.replace(/\sclass="cls-\d+"/g, '');
}

const logoSvgInline = prepareSvgForCanvas(logoSvgRaw);
const logoSidebarSvgInline = prepareSvgForCanvas(logoSidebarSvgRaw);

export {
  logoUrl,
  logoSidebarUrl,
  logoSvgInline,
  logoSidebarSvgInline,
  prepareSvgForCanvas,
};
