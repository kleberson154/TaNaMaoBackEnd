import mongoose, { Document, Schema } from 'mongoose'

export interface IPedido extends Document {
  idComprador: mongoose.Types.ObjectId
  idVendedor: mongoose.Types.ObjectId
  idProduto: mongoose.Types.ObjectId
  quantidade: number
  status: 'preparando' | 'enviado' | 'concluido'
}
