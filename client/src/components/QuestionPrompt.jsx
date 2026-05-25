import MathText from './MathText'
import { splitQuestionTextForDisplay } from '../utils/englishQuestion'

export default function QuestionPrompt({ text, subject, className = '', inline = false }) {
  const parts = splitQuestionTextForDisplay(text, subject)
  if (parts.length === 1 && !parts[0].highlight) {
    return <MathText text={text} inline={inline} className={className} />
  }

  const Tag = inline ? 'span' : 'div'
  return (
    <Tag className={`math-content ${className}`.trim()}>
      {parts.map((part, index) => (
        part.highlight ? (
          <span key={`highlight-${index}`} className="font-bold underline decoration-2 underline-offset-2">
            <MathText text={part.text} inline />
          </span>
        ) : (
          <MathText key={`text-${index}`} text={part.text} inline />
        )
      ))}
    </Tag>
  )
}
