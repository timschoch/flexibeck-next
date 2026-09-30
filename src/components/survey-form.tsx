import { Button, Paper, Radio, Stack, Text, Textarea } from '@mantine/core'
import { useState } from 'react'
import { track } from '../analytics/analytics'
import type { Experience } from '../auth/experience'
import classes from './plan-flow.module.css'

const SCORES = ['1', '2', '3', '4', '5', '6', '7']

/**
 * The Single Ease Question after the first reminder: one answer, then a thank you.
 * `experience` is the baker's sign-up answer; the event carries it so novices can be filtered.
 */
export function SurveyForm({ experience }: { experience: Experience }) {
  const [score, setScore] = useState('')
  const [comment, setComment] = useState('')
  const [answered, setAnswered] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!score) return
    track('survey_answered', { question: 'seq', score: Number(score), comment: comment.trim(), experience })
    setAnswered(true)
  }

  if (answered) {
    return (
      <Paper withBorder radius="lg" p="md" role="status">
        <Text fw={700}>Thank you</Text>
      </Paper>
    )
  }

  return (
    <Paper withBorder radius="lg" p="md">
      <form onSubmit={handleSubmit}>
        <Stack>
          <Radio.Group
            label="How easy was your first bake?"
            description="1 = Very hard, 7 = Very easy"
            value={score}
            onChange={setScore}
            required
          >
            <div className={classes.scale}>
              {SCORES.map((value) => (
                <Radio
                  key={value}
                  value={value}
                  label={value}
                  classNames={{ body: classes.scaleOption, label: classes.scaleLabel }}
                  required
                />
              ))}
            </div>
          </Radio.Group>
          <Textarea
            label="What was hard?"
            value={comment}
            onChange={(event) => setComment(event.currentTarget.value)}
            rows={3}
          />
          <Button type="submit">Send answer</Button>
        </Stack>
      </form>
    </Paper>
  )
}
