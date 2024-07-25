import * as admin from 'firebase-admin';
import path from 'path';
import doc from 'firebase-admin/firestore'

export default class NewFirebaseDB
{
  // Private variables
  private readonly db: admin.firestore.Firestore;
  private readonly bucket;

  constructor()
  {
    // Initialize env
    // dotenv.config({ path: path.join(__dirname, '../.env') });

    const serviceAccount: admin.ServiceAccount = {
      projectId: process.env.NEW_FIREBASE_PROJECT_ID!,
      privateKey: JSON.parse(process.env.NEW_FIREBASE_PRIVATE_KEY!).privateKey,
      clientEmail: process.env.NEW_FIREBASE_CLIENT_EMAIL!,
    }

    const newApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: 'https://your-project-id.firebaseio.com', // Replace with your Fire base project URL
    }, "new");

    this.db = admin.firestore(newApp);
    this.bucket = admin.storage(newApp).bucket(process.env.NEW_FIREBASE_STORAGE!);

    this.db.settings({ ignoreUndefinedProperties: true });
  }

  async updateIsGenerating(projectId: string): Promise<void>{
    const docRef = this.db.collection('test_projects').doc(projectId);
    
    const updateData = {
      contract_details: {
        is_generating: true,
        generation_percent: 0

      }
    }
    await docRef.set(updateData, {merge: true});
  }

  async updateDoneGenerating(projectId: string, img_cid: string, metadata_cid: string): Promise<void>{
    const docRef = this.db.collection('test_projects').doc(projectId);
    
    const updateData = {
      contract_details: {
        img_cid: img_cid,
        metadata_cid: metadata_cid,
        is_generating: false,
        generation_percent: 100

      }
    }
    await docRef.set(updateData, {merge: true});
  }

  async updateGenerationPercent(projectId: string, generationPercent: number): Promise<void>{
    const docRef = this.db.collection('test_projects').doc(projectId);

    const updateData = {
      contract_details: {
        generation_percent: generationPercent
      }
    }

    await docRef.set(updateData, {merge: true});
  }
}