import { time } from 'console'
import mongoose, { Document, Schema } from 'mongoose'

export interface IProduto extends Document {
  idVendedor: mongoose.Types.ObjectId
  nome: string
  categoria: string
  precoCompra: number
  precoAluguel: number
  quantidade: number
  descricao: string
  imagemUrl: string
  avaliacoes?: Array<{
    idUsuario: mongoose.Types.ObjectId
    nota: number
    comentario: string
  }>
}

const produtoSchema: Schema = new Schema(
  {
    idVendedor: { type: mongoose.Types.ObjectId, required: true },
    nome: { type: String, required: true },
    categoria: { type: String, required: true },
    precoCompra: { type: Number, required: true },
    precoAluguel: { type: Number, required: true },
    quantidade: { type: Number, required: true },
    descricao: { type: String, required: true },
    imagemUrl: { type: String, required: true },
    avaliacoes: [
      {
        idUsuario: { type: mongoose.Types.ObjectId, required: true },
        nota: { type: Number, required: true },
        comentario: { type: String, required: true },
        time: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
)

export default mongoose.model<IProduto>('Produto', produtoSchema)
