import { createContext } from 'react';

// Cria o contexto para compartilhar as instâncias de Auth e Firestore
// Apenas um arquivo para conter o contexto, que pode ser importado por outros
export const FirebaseContext = createContext(null);
