// OCRs images with the macOS Vision framework, preserving reading order.
// Usage: ocr <image> [image ...]
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!)
        continue
    }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = true
    req.recognitionLanguages = ["en-US"]

    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    do { try handler.perform([req]) } catch {
        FileHandle.standardError.write("ocr failed on \(path): \(error)\n".data(using: .utf8)!)
        continue
    }
    guard let obs = req.results else { continue }

    // Sort top-to-bottom, then left-to-right. Vision's origin is bottom-left.
    let lines = obs.compactMap { o -> (CGFloat, CGFloat, String)? in
        guard let c = o.topCandidates(1).first else { return nil }
        let b = o.boundingBox
        return (1 - b.origin.y, b.origin.x, c.string)
    }.sorted { a, b in
        if abs(a.0 - b.0) > 0.012 { return a.0 < b.0 }
        return a.1 < b.1
    }

    print("===== \(URL(fileURLWithPath: path).lastPathComponent) =====")
    for l in lines { print(l.2) }
    print()
}
