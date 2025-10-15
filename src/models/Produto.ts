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
    imagemUrl: { type: String, required: true }
  },
  { timestamps: true }
)

export default mongoose.model<IProduto>('Produto', produtoSchema)
