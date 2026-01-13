import {defineType, defineField} from 'sanity'
import {CogIcon} from '@sanity/icons'

export const chatbotSettings = defineType({
  name: 'chatbotSettings',
  title: 'Chatbot Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'systemName',
      title: 'System Name',
      type: 'string',
      description: 'Name of the assistant (e.g., "ResQWave Assistant")',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'systemDescription',
      title: 'System Description',
      type: 'text',
      rows: 4,
      description: 'Brief description of what the system does',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'welcomeMessage',
      title: 'Welcome Message',
      type: 'text',
      rows: 3,
      description: 'Initial greeting message when users start chatting',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
      description: 'Support email for users to reach out',
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: 'contactPhone',
      title: 'Contact Phone',
      type: 'string',
      description: 'Support phone number (optional)',
    }),
    defineField({
      name: 'supportHours',
      title: 'Support Hours',
      type: 'string',
      description: 'When support is available (e.g., "24/7" or "9am-5pm")',
    }),
    defineField({
      name: 'emergencyContactInfo',
      title: 'Emergency Contact Information',
      type: 'object',
      fields: [
        defineField({
          name: 'hotline',
          title: 'Emergency Hotline',
          type: 'string',
        }),
        defineField({
          name: 'instructions',
          title: 'Emergency Instructions',
          type: 'text',
          rows: 2,
        }),
      ],
    }),
    defineField({
      name: 'defaultLanguage',
      title: 'Default Language',
      type: 'string',
      options: {
        list: [
          {title: 'English', value: 'en'},
          {title: 'Tagalog', value: 'tl'},
        ],
        layout: 'radio',
      },
      initialValue: 'en',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'maxResponseLength',
      title: 'Max Response Length',
      type: 'number',
      description: 'Maximum number of sentences in AI responses',
      initialValue: 3,
      validation: (rule) => rule.required().min(1).max(10),
    }),
    defineField({
      name: 'quickActionCount',
      title: 'Quick Action Button Count',
      type: 'number',
      description: 'Number of quick action buttons to generate',
      initialValue: 3,
      validation: (rule) => rule.required().min(2).max(5),
    }),
    defineField({
      name: 'isMaintenanceMode',
      title: 'Maintenance Mode',
      type: 'boolean',
      description: 'Enable to show maintenance message',
      initialValue: false,
    }),
    defineField({
      name: 'maintenanceMessage',
      title: 'Maintenance Message',
      type: 'text',
      rows: 2,
      description: 'Message to show when in maintenance mode',
      hidden: ({document}) => !document?.isMaintenanceMode,
    }),
  ],
  preview: {
    select: {
      title: 'systemName',
      email: 'contactEmail',
      maintenance: 'isMaintenanceMode',
    },
    prepare({title, email, maintenance}) {
      return {
        title,
        subtitle: maintenance ? '⚠️ Maintenance Mode' : email,
      }
    },
  },
})
