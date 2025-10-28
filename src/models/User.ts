import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

// Interface do usuário
export interface IUser extends Document {
  nome: string
  email: string
  senha: string
  cpf: string
  endereco?: Array<{
    telefone: string
    cep: string
    rua: string
    complemento: string
    cidade: string
    estado: string
  }>
  carrinho?: Array<{
    idProduto: mongoose.Types.ObjectId
    quantidade: number
  }>
  pedidos?: Array<{
    produtos: Array<{
      idProduto: mongoose.Types.ObjectId
      quantidade: number
    }>
    status: 'preparando' | 'enviado' | 'concluido'
  }>
  produtosCriados?: Array<{
    idProduto: mongoose.Types.ObjectId
  }>
  refreshTokens?: string[]
}

// Criação do schema
const userSchema: Schema = new Schema(
  {
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    cpf: { type: String, required: true },
    endereco: [
      {
        telefone: { type: String },
        cep: { type: String },
        rua: { type: String },
        numero: { type: String },
        cidade: { type: String },
        estado: { type: String }
      }
    ],
    carrinho: [
      {
        idProduto: { type: mongoose.Types.ObjectId, required: true },
        quantidade: { type: Number, required: true }
      }
    ],
    pedidos: [
      {
        produtos: [
          {
            idProduto: { type: mongoose.Types.ObjectId, required: true },
            quantidade: { type: Number, required: true }
          }
        ],
        status: {
          type: String,
          enum: ['preparando', 'enviado', 'concluido'],
          required: true
        }
      }
    ],
    produtosCriados: [
      {
        idProduto: { type: mongoose.Types.ObjectId, required: true }
      }
    ],
    refreshTokens: { type: [String], default: [] }
  },
  { timestamps: true }
)

// hash da senha antes de salvar
userSchema.pre('save', async function (this: Document & IUser, next) {
  if (!this.isModified('senha')) return next()
  const salt = await bcrypt.genSalt(10)
  this.senha = await bcrypt.hash(this.senha, salt)
  next()
})

userSchema.methods.comparePassword = function (senha: string) {
  return bcrypt.compare(senha, this.senha)
}

// Criação do modelo
export default mongoose.model<IUser>('User', userSchema)
