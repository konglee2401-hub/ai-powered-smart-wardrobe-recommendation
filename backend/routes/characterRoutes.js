import express from 'express';
import multer from 'multer';
import { generateCharacterPreview, getCharacter, listCharacters, saveCharacterProfile, deleteCharacter, regenerateCharacterImage } from '../controllers/characterController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.get('/', listCharacters);
router.post('/generate-preview', upload.single('portraitImage'), generateCharacterPreview);
router.post('/:id/regenerate-image', upload.single('portraitImage'), regenerateCharacterImage);
router.get('/:id', getCharacter);
router.post('/', saveCharacterProfile);
router.delete('/:id', deleteCharacter);

export default router;
