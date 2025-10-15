import mongoose, { Document, Schema } from 'mongoose'

export interface IAvaliacaoProduto extends Document {
  idUsuario: mongoose.Types.ObjectId
  idProduto: mongoose.Types.ObjectId
  nota: number
  comentario: string
}

const avaliacaoProdutoSchema: Schema = new Schema(
  {
    idUsuario: { type: mongoose.Types.ObjectId, required: true },
    idProduto: { type: mongoose.Types.ObjectId, required: true },
    nota: { type: Number, required: true },
    comentario: { type: String, required: true }
  },
  { timestamps: true }
)

export default mongoose.model<IAvaliacaoProduto>(
  'AvaliacaoProduto',
  avaliacaoProdutoSchema
)
