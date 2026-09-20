// Renders each page of a PDF to a JPEG at a target pixel size.
// Usage: renderpdf <in.pdf> <outDir> <maxPx> <quality 0-1>
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard a.count == 5, let pdf = CGPDFDocument(URL(fileURLWithPath: a[1]) as CFURL),
      let maxPx = Double(a[3]), let q = Double(a[4]) else {
    FileHandle.standardError.write("usage: renderpdf <in.pdf> <outDir> <maxPx> <quality>\n".data(using:.utf8)!)
    exit(2)
}
let outDir = a[2]
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

let cs = CGColorSpaceCreateDeviceRGB()
for i in 1...pdf.numberOfPages {
    guard let page = pdf.page(at: i) else { continue }
    let box = page.getBoxRect(.mediaBox)
    let scale = maxPx / Double(max(box.width, box.height))
    let w = Int((Double(box.width) * scale).rounded())
    let h = Int((Double(box.height) * scale).rounded())
    guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8,
                              bytesPerRow: 0, space: cs,
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { continue }
    // Flatten onto white: the source pages have no meaningful transparency.
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.interpolationQuality = .high
    ctx.scaleBy(x: CGFloat(scale), y: CGFloat(scale))
    ctx.translateBy(x: -box.origin.x, y: -box.origin.y)
    ctx.drawPDFPage(page)
    guard let img = ctx.makeImage() else { continue }
    let url = URL(fileURLWithPath: "\(outDir)/p\(String(format: "%02d", i)).jpg") as CFURL
    guard let dest = CGImageDestinationCreateWithURL(url, UTType.jpeg.identifier as CFString, 1, nil)
        else { continue }
    CGImageDestinationAddImage(dest, img,
        [kCGImageDestinationLossyCompressionQuality: q] as CFDictionary)
    CGImageDestinationFinalize(dest)
    if i == 1 { print("page size \(w)x\(h)") }
}
print("rendered \(pdf.numberOfPages) pages")
