import express from 'express';
import multer from 'multer';
import { generateCharacterPreview, getCharacter, listCharacters, saveCharacterProfile, updateCharacter, deleteCharacter } from '../controllers/characterController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.get('/', listCharacters);
router.get('/:id', getCharacter);
router.post('/generate-preview', upload.single('portraitImage'), generateCharacterPreview);
router.post('/', saveCharacterProfile);
router.put('/:id', updateCharacter);
router.delete('/:id', deleteCharacter);

export default router;
