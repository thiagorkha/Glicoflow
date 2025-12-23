import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';
import { User, AuthResponse } from '../types';

export const registerUser = async (username: string, email: string, password: string): Promise<AuthResponse> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });
    
    const user: User = {
      id: userCredential.user.uid,
      username: username,
      email: email
    };
    
    return { success: true, user };
  } catch (error: any) {
    let message = 'Falha no cadastro.';
    if (error.code === 'auth/email-already-in-use') message = 'E-mail já está em uso.';
    if (error.code === 'auth/weak-password') message = 'Senha muito fraca.';
    return { success: false, message };
  }
};

export const loginUser = async (emailOrUsername: string, password: string): Promise<AuthResponse> => {
  try {
    // Nota: Firebase usa e-mail. Se o usuário digitar o username, pediremos e-mail no futuro.
    // Para simplificar, assumimos que o campo "Usuário" no login aceita o e-mail cadastrado.
    const userCredential = await signInWithEmailAndPassword(auth, emailOrUsername, password);
    
    const user: User = {
      id: userCredential.user.uid,
      username: userCredential.user.displayName || 'Usuário',
      email: userCredential.user.email || ''
    };
    
    return { success: true, user };
  } catch (error: any) {
    return { success: false, message: 'E-mail ou senha inválidos.' };
  }
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  // No Firebase Auth básico não há check de username sem Firestore, assumimos true
  return true;
};

export const checkAutoLogin = async (): Promise<User | null> => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve({
          id: user.uid,
          username: user.displayName || 'Usuário',
          email: user.email || ''
        });
      } else {
        resolve(null);
      }
    });
  });
};

export const logoutUser = async () => {
  await signOut(auth);
};