import {defineType, defineField, defineArrayMember} from 'sanity'
import {BulbOutlineIcon} from '@sanity/icons'

export const interpretDistressSignals = defineType({
  name: 'interpretDistressSignals',
  title: 'Interpret Distress Signals',
  type: 'document',
  icon: BulbOutlineIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      initialValue: 'Interpret Distress Signals',
      readOnly: true,
    }),
    defineField({
      name: 'description',
      title: 'Main Description',
      type: 'text',
      rows: 3,
      description: 'Main description of this capability',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'keywords',
      title: 'Main Keywords',
      type: 'array',
      description: 'Primary keywords for this section',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'points',
      title: 'Detailed Points',
      type: 'array',
      description: 'Each point with its answer and keywords',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'point',
              title: 'Point/Feature',
              type: 'string',
              description: 'e.g., "SOS button", "Water sensor module", "LED indicators"',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'answer',
              title: 'Predefined Answer',
              type: 'text',
              rows: 3,
              description: 'The answer to provide for this point',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'keywords',
              title: 'Keywords',
              type: 'array',
              description: 'Keywords that trigger this answer',
              of: [defineArrayMember({type: 'string'})],
              validation: (rule) => rule.required().min(1),
            }),
          ],
          preview: {
            select: {
              title: 'point',
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
    prepare({title, isActive}) {
      return {
        title,
        subtitle: isActive ? 'Active' : 'Inactive',
      }
    },
  },
})
