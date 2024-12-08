// app/page.tsx
export default function HomePage() {
  return (
    <div className="flex items-center justify-center mt-10">
      <div className="bg-white dark:bg-[#27272a] shadow-lg rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Облачное хранилище</h1>
        <p className="text-2xl text-gray-700 dark:text-gray-300 mb-6">Войдите или зарегистрируйтесь</p>
        <div className="bg-gray-100 dark:bg-[#424247] p-6 rounded-lg">
          <p className="text-lg text-gray-800 dark:text-gray-200 mb-4">Выполнено студентами группы КТСО-04-20</p>
          <ul className="list-disc list-inside text-left text-gray-800 dark:text-gray-200">
            <li>Куряевым В.А.</li>
            <li>Цыцора Д.М.</li>
            <li>Шарковым О.Д.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
