import Prando from "prando"
import { palette as createGradient, mix, Color as SColor } from "spectral.js"
import Color from "./Color"
import "./style.css"
import randomPalette, { randomPaletteWithBlack } from "./randomPalette"


const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const config = {
    width: 0,
    height: 0
};

interface Shape
{
    id: number
    x: number
    y: number
    w: number
    h: number
    weight: number
    noDraw: boolean
    color: string
}

let ctx: CanvasRenderingContext2D;
let canvas: HTMLCanvasElement;
let rnd: Prando;
let palette: string[];

let idCounter = 0;

const weights = [
    0.1,
    0.2,
    0.5,
    0.85,
    1
]

function logPalette(palette: string[])
{
    let fmt: string[] = []
    let style: string[] = []
    for (let i = 0; i < palette.length; i++)
    {
        const c = palette[i]
        fmt.push("%c\u00a0\u00a0")
        style.push(`color: ${c}; background: ${c}; font-size: 20px;`)
    }

    console.log("PALETTE("+ palette.length + "): " + fmt.join(""), ... style)
    console.log("palette:", palette)
}


function extendPalette(colorsIn: string[]): string[]
{
    const colors = colorsIn.slice()
    for (let i = 0; i < colorsIn.length; i++)
    {
        const colA = colorsIn[i]
        for (let j = i + 1; j < colorsIn.length; j++)
        {
            const colB = colorsIn[j]
            if (colA !== colB)
            {

                colors.push(
                    mix([
                            new SColor(colA),
                            3
                        ], [
                            new SColor(colB),
                            1
                        ]
                    ).toString(),
                    mix([
                            new SColor(colA),
                            2
                        ], [
                            new SColor(colB),
                            2
                        ]
                    ).toString(),
                    mix([
                            new SColor(colA),
                            1
                        ], [
                            new SColor(colB),
                            3
                        ]
                    ).toString(),

                )
            }
        }
    }

    return colors
}


function rect(x: number, y: number, w: number, h: number, noDraw = false, color = palette[0 | rnd.next() * palette.length]): Shape
{
    if (color.indexOf("NAN") >= 0)
    {
        throw new Error("Invalid color")
    }

    return {
        id: -1,
        x: x | 0,
        y: y | 0,
        w: w | 0,
        h: h | 0,
        weight: rnd.nextArrayItem(weights),
        noDraw,
        color
    }
}

const splitLimit = 2


function getColorPair(): [string, string]
{
    const colorA = palette[0|Math.random() * palette.length]
    let colorB: string
    do
    {
        colorB = palette[0|Math.random() * palette.length]
    } while (colorA === colorB)

    return [colorA, colorB]
}


function splitShape(shape: Shape, horizontal: boolean): Shape[]
{
    let {x, y, w, h} = shape

    const ratio = horizontal ?  Math.ceil(w / h) : Math.ceil(h / w)

    const splits = rnd.nextInt(Math.max(1,ratio - 1), ratio + 2)

    const out: Shape[] = []
    const step = horizontal ? w / splits : h / splits

    const [colA, colB] = getColorPair()

    const g: (SColor | string)[] = splits > 1 ? createGradient(
        new SColor(colA),
        new SColor(colB),
        splits
    ) : [ colA, colB ]

    console.log("GRADIENT", g)

    const last = splits - 1
    for (let i = 0; i < splits; i++)
    {
        if (horizontal)
        {
            out.push(
                rect(x + i * step, y, i === last ? w : step, h, false, g[i].toString())
            )
            w -= step
        }
        else
        {
            out.push(
                rect(x, y + i * step, w, i === last ? h : step, false, g[i].toString())
            )
            h -= step
        }

    }
    return out
}

function split(shape: Shape): Shape[]
{
    const { w, h } = shape

    const ratio = w/h

    if (ratio < 1/splitLimit)
    {
        return splitShape(shape, false)
    }
    else if (ratio > splitLimit)
    {
        return splitShape(shape, true)
    }
    else
    {
        return splitShape(shape, rnd.nextBoolean())
    }
}


function drawShape(shape: Shape, stroke?: boolean)
{
    const {x, y, w, h, id} = shape

    if (stroke)
    {
        ctx.fillStyle = ctx.strokeStyle = palette[0 | Math.random() * palette.length]
        ctx.strokeRect(x, y, w, h)

        ctx.fillText(String(id), x + 4, y + 20 )
    }
    else
    {
        //ctx.fillStyle = palette[0|Math.random() * palette.length]
        ctx.fillStyle = "rgba(255,255,255,0.05)"
        ctx.fillRect(x, y, w, h)
    }
}




function splitAll(shapes: Shape[]): Shape[]
{
    let splitShapes: Shape[] = []
    for (let j = 0; j < shapes.length; j++)
    {
        splitShapes = splitShapes.concat(split(shapes[j]))
    }
    return splitShapes
}


function probability(s: Shape): number
{
    const maxArea = config.width * config.height
    return Math.pow(s.w * s.h/ maxArea, 0.125) / 24
}


function paintShape(imageData: ImageData, shape: Shape)
{
    if (shape.weight === 1)
    {
        paintShapeOpaque(imageData, shape)
    }

    const {width, height} = config
    const {x: minX, y: minY, w, h} = shape

    const {data} = imageData

    let mixed = Color.from(shape.color)
    let prevColor: string | null = null
    for (let y = minY; y < minY + h; y++)
    {
        for (let x = minX; x < minX + w; x++)
        {
            const off = ((y * width) + x) * 4

            const r = data[off]
            const g = data[off + 1]
            const b = data[off + 2]

            const col = Color.from(shape.color)
            if (r === 0 && g === 0 && b === 0)
            {
                data[off] = col.r
                data[off + 1] = col.g
                data[off + 2] = col.b
                data[off + 3] = 255
            }
            else
            {
                let input = new Color(r, g, b).toRGBHex()

                if (input !== prevColor)
                {
                    mixed = Color.from(
                        mix(
                            [new SColor(input), 1],
                            [new SColor(col.toRGBHex()), shape.weight]
                        ).toString()
                    )
                    prevColor = input
                }

                data[off] = mixed.r
                data[off + 1] = mixed.g
                data[off + 2] = mixed.b
                data[off + 3] = 255
            }
        }
    }
}

function paintShapeOpaque(imageData: ImageData, shape: Shape)
{

    const { width, height} = config
    const { x : minX, y : minY, w, h} = shape

    const { data } = imageData

    for (let y = minY; y < minY + h; y++)
    {
        for (let x = minX; x < minX + w; x++)
        {
            const off = ((y * width) + x) * 4

            const col=  Color.from(shape.color)
            data[off    ] = col.r
            data[off + 1] = col.g
            data[off + 2] = col.b
            data[off + 3] = 255;
        }
    }
}


// module scripts are deferred, so the DOM is ready when this runs
{
    {
        canvas = document.getElementById("screen") as HTMLCanvasElement;
        ctx = canvas.getContext("2d")!;

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;

        const paint = () => {

            idCounter = 1
            rnd = new Prando(Math.random() * 0x7fffffff);

            palette = extendPalette(randomPalette(rnd.next()));
            logPalette(palette);

            ctx.fillStyle = "#000"
            //ctx.lineWidth = 4
            ctx.fillRect(0, 0, width, height);


            function layer()
            {
                let shapes = [
                    rect(0, 0, width, height, true)
                ]
                //draw(shapes, stroke)
                
                const numSplits = rnd.nextInt(4,6)
                for (let i = 0; i < numSplits; i++)
                {
                    let splitShapes = splitAll(shapes)
                    shapes = shapes.concat(splitShapes)
                }
                return shapes
            }

            let shapes = layer()
            shapes = shapes.concat(layer())


            const shapesDrawn = shapes
                .filter(s => {
                    if (s.noDraw)
                    {
                        return false;
                    }

                    const areaProb = probability(s)

                    return !s.noDraw && rnd.next() < areaProb;
                })

            shapesDrawn.sort((a, b) => {
                return b.weight - a.weight
            })

            console.log("SHAPES", shapesDrawn)
            let probs = shapesDrawn.map(probability)
            console.log("PROBS", probs)

            // const size = Math.floor(Math.min(width,height) * 0.9)
            //
            // ctx.strokeStyle = "#080"
            // ctx.beginPath()
            // const step = size / probs.length
            // for (let i = 0; i < probs.length; i++)
            // {
            //     const v = probs[i]
            //
            //     let x = i * step
            //     let y = size - v * size
            //
            //     if (i === 0)
            //     {
            //         ctx.moveTo(x, y)
            //     }
            //     else
            //     {
            //         ctx.lineTo(x, y)
            //     }
            //
            // }
            //
            // ctx.moveTo(0,size)
            // ctx.lineTo(size,size)
            //
            // ctx.stroke()

            // shapesDrawn.forEach((s, idx) => {
            //     s.id = idx
            //     drawShape(s)
            // })

            const imageData = ctx.getImageData(0,0,width, height);

            shapesDrawn.forEach((s, idx) => {
                s.id = idx
                paintShape(imageData, s)
            })

            ctx.putImageData(imageData, 0, 0)
        }

        paint()

        canvas.addEventListener("click", paint, true)
    }
}
