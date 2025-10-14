import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

// Interface do usuário
export interface IUser extends Document {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
}

// Criação do schema
const userSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true }
  },
  { timestamps: true }
)

// hash da senha antes de salvar
userSchema.pre('save', async function (this: Document & IUser, next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

userSchema.methods.comparePassword = function (password: string) {
  return bcrypt.compare(password, this.password)
}

// Criação do modelo
export default mongoose.model<IUser>('User', userSchema)
