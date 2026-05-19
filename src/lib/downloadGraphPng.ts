function inlineComputedPaint(source: Element, target: Element): void {
  if (!(target instanceof SVGElement)) return
  const cs = getComputedStyle(source)
  const fillAttr = target.getAttribute('fill')
  if (fillAttr?.includes('var(')) {
    const fill = cs.fill
    if (fill && fill !== 'none') target.setAttribute('fill', fill)
  }
  const strokeAttr = target.getAttribute('stroke')
  if (strokeAttr?.includes('var(')) {
    const stroke = cs.stroke
    if (stroke && stroke !== 'none') target.setAttribute('stroke', stroke)
  }
}

function prepareSvgClone(source: SVGSVGElement): SVGSVGElement {
  const clone = source.cloneNode(true) as SVGSVGElement
  const sourceNodes = [source, ...source.querySelectorAll('*')]
  const cloneNodes = [clone, ...clone.querySelectorAll('*')]

  for (let i = 0; i < sourceNodes.length; i += 1) {
    inlineComputedPaint(sourceNodes[i], cloneNodes[i])
  }

  const bgRect = source.querySelector('rect')
  const cloneBg = clone.querySelector('rect')
  if (bgRect && cloneBg) {
    const fill = getComputedStyle(bgRect).fill
    if (fill) cloneBg.setAttribute('fill', fill)
  }

  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }

  return clone
}

export async function downloadGraphPng(
  svg: SVGSVGElement,
  filename: string,
): Promise<void> {
  const clone = prepareSvgClone(svg)
  const viewBox = clone.viewBox.baseVal
  const w = viewBox.width > 0 ? viewBox.width : svg.clientWidth || 800
  const h = viewBox.height > 0 ? viewBox.height : svg.clientHeight || 600

  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))

  const svgString = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  })
  const url = URL.createObjectURL(svgBlob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not rasterize graph'))
      image.src = url
    })

    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')

    const bg =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--chart-bg')
        .trim() || '#1a1a1a'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG export failed'))),
        'image/png',
      )
    })

    const pngUrl = URL.createObjectURL(pngBlob)
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = filename
    link.click()
    URL.revokeObjectURL(pngUrl)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function findChartSvg(root: HTMLElement): SVGSVGElement | null {
  return root.querySelector('svg.data-chart, svg.pixel-grid-chart')
}
