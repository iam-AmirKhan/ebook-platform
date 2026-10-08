import type { BookReview } from "@/types/book-details";

interface ReviewsListProps {
  reviews: BookReview[];
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No reviews yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Be the first to review this book after purchasing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review._id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              {review.reviewerName}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center text-brand">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={i < review.rating ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={i < review.rating ? "text-brand" : "text-muted-foreground/30"}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed mt-1">
            {review.comment}
          </p>
        </div>
      ))}
    </div>
  );
}
