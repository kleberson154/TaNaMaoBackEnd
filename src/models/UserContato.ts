import mongoose, { Document, Schema } from 'mongoose'

export interface IUserContato extends Document {
  idUser: mongoose.Types.ObjectId
  telefone: string
  cep: string
  rua: string
  numero: string
  cidade: string
  estado: string
}

const UserContatoSchema: Schema = new Schema({
  idUser: { type: mongoose.Types.ObjectId, required: true },
  telefone: { type: String, required: true },
  cep: { type: String, required: true },
  rua: { type: String, required: true },
  numero: { type: String, required: true },
  cidade: { type: String, required: true },
  estado: { type: String, required: true }
})

export default mongoose.model<IUserContato>('UserContato', UserContatoSchema)
