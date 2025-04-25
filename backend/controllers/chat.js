const asyncHandler = require('express-async-handler');
const Chat = require('../models/Chat');

// @desc    Get all chats for a user
// @route   GET /api/chat
// @access  Private
const getChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ user: req.user._id }).sort('-updatedAt');
  res.json(chats);
});

// @desc    Get single chat
// @route   GET /api/chat/:id
// @access  Private
const getChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  res.json(chat);
});

// @desc    Create new chat
// @route   POST /api/chat
// @access  Private
const createChat = asyncHandler(async (req, res) => {
  const { title, model } = req.body;

  const chat = await Chat.create({
    user: req.user._id,
    title: title || 'New Chat',
    model: model || 'gpt-3.5-turbo',
    messages: []
  });

  res.status(201).json(chat);
});

// @desc    Update chat
// @route   PUT /api/chat/:id
// @access  Private
const updateChat = asyncHandler(async (req, res) => {
  const { title, messages, model } = req.body;

  const chat = await Chat.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  if (title) chat.title = title;
  if (messages) chat.messages = messages;
  if (model) chat.model = model;

  const updatedChat = await chat.save();
  res.json(updatedChat);
});

// @desc    Delete chat
// @route   DELETE /api/chat/:id
// @access  Private
const deleteChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  await chat.remove();
  res.json({ message: 'Chat removed' });
});

module.exports = {
  getChats,
  getChat,
  createChat,
  updateChat,
  deleteChat
};