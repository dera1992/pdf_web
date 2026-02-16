import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { PDF_TOOLS, TOOL_CATEGORIES } from '../data/pdfTools'

export const ToolsPage = () => (
  <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-6">
    <div className="mb-8">
      <h1 className="text-3xl font-semibold text-surface-900 dark:text-white">PDF Tools</h1>
      <p className="mt-2 text-surface-600 dark:text-surface-300">
        Choose any tool to open its dedicated page and run the related API workflow.
      </p>
    </div>

    <div className="space-y-8">
      {TOOL_CATEGORIES.map((category) => {
        const tools = PDF_TOOLS.filter((tool) => tool.category === category.id)
        return (
          <section key={category.id}>
            <h2 className="mb-4 text-xl font-semibold text-surface-900 dark:text-white">{category.label}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <Card key={tool.id} className="p-5">
                  <div className="flex h-full flex-col">
                    <h3 className="text-base font-semibold text-surface-900 dark:text-white">{tool.name}</h3>
                    <p className="mt-2 flex-1 text-sm text-surface-600 dark:text-surface-300">{tool.description}</p>
                    <Link
                      to={tool.route}
                      className="mt-4 inline-flex items-center text-sm font-semibold text-accent-600 hover:text-accent-700"
                    >
                      Open tool →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  </div>
)
