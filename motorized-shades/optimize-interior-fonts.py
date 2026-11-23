# One-time font optimization. Run from the repository root with fonttools and brotli installed.
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
root=Path('motorized-shades/dist/assets')
latin=set(range(256))|{0x131,0x152,0x153,0x2bb,0x2bc,0x2c6,0x2da,0x2dc,0x2074,0x20ac,0x2122,0x2212,0x2215,0x2605,0x2713,0xfeff,0xfffd}|set(range(0x2000,0x2070))|set(range(0x2190,0x219a))
latin.update(map(ord, Path('motorized-shades/dist/index.html').read_text()))
def ranges(points):
 out=[]
 for n in sorted(points):
  if out and n==out[-1][1]+1:out[-1][1]=n
  else:out.append([n,n])
 return ','.join('U+%X'%a+('-%X'%b if a!=b else '') for a,b in out)
faces=[]
for weight in (400,500,600,700):
 source=root/f'interior-inter-{weight}.woff2'; target=root/f'interior-inter-{weight}-latin.woff2'
 font=TTFont(source, recalcTimestamp=False); cmap=set(font.getBestCmap())
 options=subset.Options();options.layout_features=['*']
 sub=subset.Subsetter(options=options);sub.populate(unicodes=latin);sub.subset(font)
 font.flavor='woff2';font.save(target)
 for filename,chars in [(source.name,cmap-latin),(target.name,cmap&latin)]:
  faces.append("@font-face{font-family:Inter;font-style:normal;font-weight:%s;font-display:swap;src:url('assets/%s') format('woff2');unicode-range:%s}"%(weight,filename,ranges(chars)))
 print(weight,source.stat().st_size,target.stat().st_size)
p=Path('motorized-shades/dist/interior.css');s=p.read_text()
lines=s.splitlines();lines=[line for line in lines if not(line.startswith('@font-face') and 'font-family:Inter;' in line)]
lines[1:1]=faces
p.write_text('\n'.join(lines)+'\n')
p=Path('motorized-shades/dist/index.html');s=p.read_text().replace('href="assets/interior-inter-400.woff2"','href="assets/interior-inter-400-latin.woff2"');p.write_text(s)
