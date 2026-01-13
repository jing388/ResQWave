import { defineType, defineField, defineArrayMember } from 'sanity'
import { HelpCircleIcon } from '@sanity/icons'

export const handleGeneralQuestions = defineType({
  name: 'handleGeneralQuestions',
  title: 'Handle General Questions',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      initialValue: 'Handle General Questions',
      readOnly: true,
    }),
    defineField({
      name: 'description',
      title: 'Main Description',
      type: 'text',
      rows: 2,
      description: 'Description of what this section provides',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'keywords',
      title: 'Keywords',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Keywords that trigger general question responses',
    }),
    defineField({
      name: 'predefinedAnswers',
      title: 'Predefined Answers',
      type: 'array',
      description: 'General questions with predefined answers',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'topic',
              title: 'Topic',
              type: 'string',
              description: 'e.g., "What is the purpose of ResQWave?"',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'keywords',
              title: 'Keywords',
              type: 'array',
              description: 'Keywords that trigger this answer',
              of: [defineArrayMember({ type: 'string' })],
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: 'answer',
              title: 'Predefined Answer',
              type: 'text',
              rows: 3,
              description: 'The answer to provide',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'userRoles',
              title: 'User Roles',
              type: 'array',
              description: 'Which roles can access this answer',
              of: [defineArrayMember({ type: 'string' })],
              validation: (rule) => rule.required().min(1),
            }),
          ],
          preview: {
            select: {
              title: 'topic',
              subtitle: 'answer',
            },
          },
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      isActive: 'isActive',
    },
    prepare({ title, isActive }) {
      return {
        title,
        subtitle: isActive ? 'Active' : 'Inactive',
      }
    },
  },
})
