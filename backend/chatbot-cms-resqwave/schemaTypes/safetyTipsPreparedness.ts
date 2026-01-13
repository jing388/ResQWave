import { defineType, defineField, defineArrayMember } from 'sanity'
import { WarningOutlineIcon } from '@sanity/icons'

export const safetyTipsPreparedness = defineType({
  name: 'safetyTipsPreparedness',
  title: 'Safety Tips & Preparedness Guidance',
  type: 'document',
  icon: WarningOutlineIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      initialValue: 'Safety Tips & Preparedness Guidance',
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
      description: 'Keywords that trigger safety tips responses',
    }),
    defineField({
      name: 'predefinedAnswers',
      title: 'Predefined Safety Answers',
      type: 'array',
      description: 'Safety tips and preparedness advice',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'topic',
              title: 'Safety Topic',
              type: 'string',
              description: 'e.g., "Flood safety tips", "Emergency kit checklist"',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'answer',
              title: 'Predefined Answer',
              type: 'text',
              rows: 4,
              description: 'Safety tips and guidance',
              validation: (rule) => rule.required(),
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
