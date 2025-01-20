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
    const docRef = this.db.collection('projects').doc(projectId);
    
    const updateData = {
      contract_details: {
        is_generating: true,
        generation_percent: 0

      }
    }
    await docRef.set(updateData, {merge: true});
  }

  async updateDoneGenerating(projectId: string, img_cid: string, metadata_cid: string): Promise<void>{
    const docRef = this.db.collection('projects').doc(projectId);
    
    const updateData = {
      contract_details: {
        img_cid: img_cid,
        metadata_cid: metadata_cid,
        is_generating: false,
        generation_percent: 100
      },
      status: 7
    }
    await docRef.set(updateData, {merge: true});
  }

  async updateGenerationPercent(projectId: string, generationPercent: number): Promise<void>{
    const docRef = this.db.collection('projects').doc(projectId);

    const updateData = {
      contract_details: {
        generation_percent: generationPercent
      }
    }

    await docRef.set(updateData, {merge: true});
  }

  async updateErrorGenerating(projectId: string, error_message: string): Promise<void>{
    const docRef = this.db.collection('projects').doc(projectId);

    const updateData = {
      contract_details: {
        is_generating: false,
        generation_percent: 0,
        error_message: error_message
      }
    }

    await docRef.set(updateData, {merge: true})
  }

  async getPartnerCode(projectId: string): Promise<boolean>{
    const docRef = this.db.collection('projects').doc(projectId);

    try{
      const doc = await docRef.get();

      if(doc.exists){
        // Access the specific field
        const fieldValue: string = doc.get('contract_details.contract_settings.partner_code');

        // Check if fieldValue is a valid non-empty string
        if (typeof fieldValue === 'string' && fieldValue.trim().length > 0) {
          return true; // Return true if the field value is a valid non-empty string
        }
      } else {
        console.log('No such document!');
      }
    } catch (error) {
      console.error('Error getting document:', error);
    }

    return false; // Return false if the field is undefined, empty, or document doesn't exist
  }

  async getDnaList(projectId: string): Promise<any> {
    const docRef = this.db.collection('projects').doc(projectId);

    try {
      const doc = await docRef.get();
      const dnaListUrl = doc.get('dna_list');
      
      if (typeof dnaListUrl === 'string') {
        const response = await fetch(dnaListUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
      }
      
      return dnaListUrl;
    } catch (error) {
      console.error('Error getting DNA list:', error);
      throw error;
    }
  }
}
