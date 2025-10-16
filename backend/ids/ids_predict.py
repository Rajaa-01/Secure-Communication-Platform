import sys
import json
import pandas as pd
import pickle
from pathlib import Path
import traceback
import logging
from datetime import datetime

# Configuration du logging professionnel
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('ids_predict.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('IDS_Predictor')

# Chemins absolus
MODEL_DIR = Path(__file__).parent.resolve()
MODEL_PATH = MODEL_DIR / "xgboost_UNSW-NB15_model.pkl"

class ModelLoader:
    @staticmethod
    def load():
        """Charge le modèle avec gestion d'erreur avancée"""
        try:
            logger.info(f"Chargement du modèle depuis {MODEL_PATH}")
            
            if not MODEL_PATH.exists():
                raise FileNotFoundError(f"Fichier modèle introuvable: {MODEL_PATH}")
                
            with open(MODEL_PATH, 'rb') as f:
                model_data = pickle.load(f)
                
            if 'model' not in model_data or 'columns' not in model_data:
                raise ValueError("Structure de modèle invalide")
                
            logger.info(f"Modèle chargé - {len(model_data['columns'])} colonnes attendues")
            return model_data['model'], model_data['columns']
            
        except Exception as e:
            logger.error(f"ERREUR chargement modèle: {str(e)}\n{traceback.format_exc()}")
            raise

class DataPreprocessor:
    @staticmethod
    def prepare(file_path, expected_columns):
        """Prépare les données avec validation complète"""
        try:
            start_time = datetime.now()
            logger.info(f"Début préparation des données - Fichier: {file_path}")
            
            # Lecture intelligente du CSV
            df = pd.read_csv(file_path)
            logger.info(f"Données brutes chargées - {df.shape[0]} lignes, {df.shape[1]} colonnes")
            
            # Journalisation des métadonnées
            logger.info(f"Colonnes fournies: {list(df.columns)}")
            logger.info(f"3 premières lignes:\n{df.head(3).to_string()}")
            
            # Analyse des colonnes
            missing_cols = set(expected_columns) - set(df.columns)
            common_cols = set(expected_columns) & set(df.columns)
            
            logger.info(f"Colonnes communes: {len(common_cols)}/{len(expected_columns)}")
            logger.info(f"Colonnes manquantes: {missing_cols}")
            
            # Ajout des colonnes manquantes avec 0 et conversion de type
            for col in expected_columns:
                if col not in df.columns:
                    df[col] = 0
                # Conversion forcée au type attendu
                if col.startswith(('proto_', 'service_', 'state_')):
                    df[col] = df[col].astype(int)
                elif df[col].dtype == 'object':
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
            # Sélection des colonnes dans l'ordre exact
            df = df[expected_columns]
            
            # Validation finale
            if list(df.columns) != expected_columns:
                raise ValueError("Ordre des colonnes incorrect après préparation")
                
            logger.info(f"Préparation terminée en {(datetime.now() - start_time).total_seconds():.2f}s")
            return df
            
        except Exception as e:
            logger.error(f"ERREUR préparation données: {str(e)}\n{traceback.format_exc()}")
            raise

def main():
    if len(sys.argv) != 2:
        result = {
            "status": "error",
            "message": "Usage: python ids_predict.py <chemin_csv>",
            "code": "INVALID_ARGS"
        }
        print(json.dumps(result))
        sys.exit(1)

    try:
        start_time = datetime.now()
        logger.info(f"\n{'='*40}\nDébut analyse - {start_time}\n{'='*40}")
        
        # 1. Chargement du modèle
        model, expected_columns = ModelLoader.load()
        
        # 2. Préparation des données
        input_data = DataPreprocessor.prepare(sys.argv[1], expected_columns)
        
        # 3. Prédiction
        logger.info("Début des prédictions...")
        predictions = model.predict(input_data)
        
        # 4. Formatage des résultats
        result = {
            "status": "success",
            "predictions": predictions.tolist(),
            "stats": {
                "total": len(predictions),
                "normal": int((predictions == 0).sum()),
                "attack": int((predictions == 1).sum()),
                "attack_percentage": float((predictions == 1).mean() * 100)
            },
            "metadata": {
                "input_columns": input_data.columns.tolist(),
                "processed_rows": len(input_data),
                "processing_time": f"{(datetime.now() - start_time).total_seconds():.2f}s"
            }
        }
        
        logger.info(f"Analyse terminée avec succès - {result['stats']['total']} entrées traitées")
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "status": "error",
            "message": str(e),
            "code": "PROCESSING_ERROR",
            "details": traceback.format_exc()
        }
        logger.error(f"ERREUR analyse: {json.dumps(error_result, indent=2)}")
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()