const express = require('express');
const router = express.Router();
const { getChats, getChat, createChat, updateChat, deleteChat } = require('../controllers/chat');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

router.route('/')
  .get(getChats)
  .post(createChat);

router.route('/:id')
  .get(getChat)
  .put(updateChat)
  .delete(deleteChat);

module.exports = router;