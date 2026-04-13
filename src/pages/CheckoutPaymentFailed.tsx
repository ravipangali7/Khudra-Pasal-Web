import { Link, useSearchParams } from 'react-router-dom';

export default function CheckoutPaymentFailed() {
  const [params] = useSearchParams();
  const gateway = params.get('gateway');

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-bold">Payment not completed</h1>
        <p className="text-muted-foreground">
          {gateway === 'esewa'
            ? 'The eSewa payment was cancelled or could not be completed. No charge was made.'
            : 'The payment could not be completed. No charge was made.'}
        </p>
        <Link
          to="/checkout"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-category-fresh text-white font-semibold text-sm hover:opacity-90"
        >
          Back to checkout
        </Link>
      </div>
    </div>
  );
}
