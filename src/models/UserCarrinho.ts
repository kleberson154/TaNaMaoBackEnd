import mongoose, { Document, Schema } from 'mongoose'

export interface ICarrinho extends Document {
  idUsuario: mongoose.Types.ObjectId
  produtos: Array<{
    idProduto: mongoose.Types.ObjectId
    quantidade: number
  }>
}

const carrinhoSchema: Schema = new Schema(
  {
    idUsuario: { type: mongoose.Types.ObjectId, required: true, unique: true },
    produtos: [
      {
        idProduto: { type: mongoose.Types.ObjectId, required: true },
        quantidade: { type: Number, required: true }
      }
    ]
  },
  { timestamps: true }
)

export default mongoose.model<ICarrinho>('Carrinho', carrinhoSchema)
