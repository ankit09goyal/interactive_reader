export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-9 w-64 mb-2"></div>
          <div className="skeleton h-5 w-48"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-4">
            <div className="skeleton h-5 w-16"></div>
            <div className="skeleton h-5 w-24"></div>
            <div className="skeleton h-5 w-16"></div>
          </div>
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-wrap items-center gap-4 bg-base-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-12"></div>
          <div className="skeleton h-8 w-28 rounded-lg"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-10"></div>
          <div className="skeleton h-8 w-32 rounded-lg"></div>
        </div>
        <div className="ml-auto">
          <div className="skeleton h-8 w-36 rounded-lg"></div>
        </div>
      </div>

      {/* Questions list skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <QuestionRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function QuestionRowSkeleton() {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {/* Badges skeleton */}
          <div className="flex flex-wrap gap-2">
            <div className="skeleton h-5 w-14 rounded-full"></div>
            <div className="skeleton h-5 w-20 rounded-full"></div>
            <div className="skeleton h-5 w-24 rounded-full"></div>
          </div>

          {/* Selected text skeleton */}
          <div className="skeleton h-3 w-3/4"></div>

          {/* Question skeleton */}
          <div className="space-y-2">
            <div className="skeleton h-5 w-full"></div>
            <div className="skeleton h-5 w-2/3"></div>
          </div>

          {/* Answer preview skeleton */}
          <div className="skeleton h-4 w-4/5"></div>

          {/* Meta info skeleton */}
          <div className="flex items-center gap-4">
            <div className="skeleton h-3 w-32"></div>
            <div className="skeleton h-3 w-20"></div>
          </div>
        </div>

        {/* Arrow skeleton */}
        <div className="skeleton h-5 w-5 flex-shrink-0"></div>
      </div>
    </div>
  );
}
