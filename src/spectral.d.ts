// Type declarations for spectral.js 3.x, which ships as an untyped UMD bundle.
// See node_modules/spectral.js/spectral.js for the implementation.
declare module "spectral.js" {

    export type GamutMethod = "map" | "clip"

    export class Color {
        /**
         * Creates a color from a CSS color string (hex or rgb()), an sRGB array (0-255) or
         * a 38-element spectral reflectance array.
         */
        constructor(color: string | number[])

        /** sRGB components, 0-255 */
        sRGB: number[]
        /** linear RGB components, 0-1 */
        lRGB: number[]
        /** spectral reflectance curve (38 samples) */
        R: number[]
        XYZ: number[]

        readonly OKLab: number[]
        readonly OKLCh: number[]
        readonly KS: number[]
        readonly luminance: number
        tintingStrength: number

        inGamut(options?: { epsilon?: number }): boolean
        toGamut(options?: { method?: GamutMethod }): Color
        toString(options?: { format?: "hex" | "rgb", method?: GamutMethod }): string
    }

    /** A color with its mixing factor or gradient position. */
    export type WeightedColor = [Color, number]

    /** Mixes colors using Kubelka-Munk theory, weighted by their factors. */
    export function mix(...colors: WeightedColor[]): Color

    /** Generates `size` colors transitioning from `a` to `b`. */
    export function palette(a: Color, b: Color, size: number): Color[]

    /** Interpolates the color at `t` (0-1) between colors at the given positions. */
    export function gradient(t: number, ...colors: WeightedColor[]): Color
}
