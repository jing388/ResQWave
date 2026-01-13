import {chatbotSettings} from './chatbotSettings'
import {interpretDistressSignals} from './interpretDistressSignals'
import {handleGeneralQuestions} from './handleGeneralQuestions'
import {userGuidance} from './userGuidance'
import {clarificationRequestsFallback} from './clarificationRequestsFallback'
import {safetyTipsPreparedness} from './safetyTipsPreparedness'
import {contactInformation} from './contactInformation'

export const schemaTypes = [
  // Chatbot content types matching original structure
  chatbotSettings,
  interpretDistressSignals,
  handleGeneralQuestions,
  userGuidance,
  clarificationRequestsFallback,
  safetyTipsPreparedness,
  contactInformation,
]
