import { defineType, defineField, defineArrayMember } from 'sanity'
import { SearchIcon } from '@sanity/icons'

export const clarificationRequestsFallback = defineType({
  name: 'clarificationRequestsFallback',
  title: 'Clarification Requests Fallback',
  type: 'document',
  icon: SearchIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      initialValue: 'Clarification Requests Fallback',
      readOnly: true,
    }),
    defineField({
      name: 'description',
      title: 'Usage Description',
      type: 'text',
      rows: 2,
      initialValue: 'For unclear or unmatched inputs, choose one dynamically',
      description: 'When to use these clarification messages',
    }),
    defineField({
      name: 'keywords',
      title: 'Keywords',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Keywords that trigger clarification responses',
    }),
    defineField({
      name: 'messages',
      title: 'Clarification Messages',
      type: 'array',
      description: 'List of clarification messages to choose from',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'message',
              title: 'Message',
              type: 'text',
              rows: 2,
              description: 'A friendly clarification message',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {
              title: 'message',
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
