"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ChevronDown, 
  Mail, 
  Phone, 
  MapPin, 
  Store, 
  Building2, 
  MessageSquarePlus, 
  Send, 
  Clock, 
  CheckCircle2, 
  X, 
  User, 
  ShieldCheck, 
  Crown,
  HelpCircle,
  ShoppingBag,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface BranchContact {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gcashNumber?: string | null;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface SupportQuestion {
  id: string;
  customerId: string;
  customerName: string;
  branchName: string;
  subject: string;
  question: string;
  orderId?: string | null;
  status: 'Pending' | 'Answered' | 'Closed';
  createdAt: string;
  updatedAt: string;
  replies: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    message: string;
    createdAt: string;
  }>;
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    id: '1',
    question: "How long do repairs usually take?",
    answer: "Repair duration depends on the type of issue and the availability of replacement parts. Our branch staff will provide an estimated completion time after checking the device."
  },
  {
    id: '2',
    question: "What payment methods do you accept?",
    answer: "Currently, our system accepts Cash and GCash payments for products, reservations, and repair services."
  }
];

const DEFAULT_BRANCHES: BranchContact[] = [
  {
    id: 'tagoloan',
    name: 'Tagoloan Branch',
    address: 'Tagoloan, Misamis Oriental',
    phone: '0967 123 4567',
    email: 'tagoloan@graphix.com'
  },
  {
    id: 'villanueva',
    name: 'Villanueva Branch',
    address: 'Villanueva, Misamis Oriental',
    phone: '0967 123 4567',
    email: 'villanueva@graphix.com'
  },
  {
    id: 'jasaan',
    name: 'Jasaan Branch',
    address: 'Jasaan, Misamis Oriental',
    phone: '0967 123 4567',
    email: 'jasaan@graphix.com'
  }
];

export default function CustomerHelpSupport() {
  const router = useRouter();
  const navigate = router.push;

  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FAQItem[]>(DEFAULT_FAQS);
  const [branches, setBranches] = useState<BranchContact[]>(DEFAULT_BRANCHES);

  // Ask a Question & My Questions state
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('Tagoloan');
  const [subject, setSubject] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // My Questions
  const [myQuestions, setMyQuestions] = useState<SupportQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<SupportQuestion | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Fetch FAQs
  useEffect(() => {
    fetch('/api/faqs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setFaqs(data);
        }
      })
      .catch(err => {
        console.error('Failed to load FAQs:', err);
      });

    // Fetch Branches
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.branches) && data.branches.length > 0) {
          const mapped: BranchContact[] = data.branches.map((b: any) => {
            const cleanName = b.name.replace(/\s*Branch$/i, '').trim();
            return {
              id: b.id || cleanName.toLowerCase(),
              name: `${cleanName} Branch`,
              address: b.address || `${cleanName}, Misamis Oriental`,
              phone: b.phone || b.gcashNumber || '0967 123 4567',
              email: b.email || `${cleanName.toLowerCase()}@graphix.com`,
              gcashNumber: b.gcashNumber
            };
          });
          setBranches(mapped);
          if (mapped.length > 0 && mapped[0]?.name) {
            setSelectedBranch(mapped[0].name.replace(/\s*Branch$/i, '').trim());
          }
        }
      })
      .catch(err => {
        console.error('Failed to load branches for contact info:', err);
      });

    // Fetch Customer's own orders
    fetch('/api/purchases')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCustomerOrders(data);
        } else if (data && Array.isArray(data.purchases)) {
          setCustomerOrders(data.purchases);
        }
      })
      .catch(err => console.error('Failed to fetch customer orders:', err));

    fetchMyQuestions();
  }, []);

  const fetchMyQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch('/api/support/questions');
      const data = await res.json();
      if (data && Array.isArray(data.questions)) {
        setMyQuestions(data.questions);
      }
    } catch (err) {
      console.error('Failed to fetch my questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleOpenAskModal = () => {
    setSubject('');
    setQuestionText('');
    setSelectedOrderId('');
    setSubmitSuccessMsg(null);
    setIsAskModalOpen(true);
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !subject.trim() || !questionText.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: selectedBranch,
          subject: subject.trim(),
          question: questionText.trim(),
          orderId: selectedOrderId || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitSuccessMsg(data.message || `Your question has been sent to ${selectedBranch} Branch.`);
        fetchMyQuestions();
      } else {
        alert(data.error || 'Failed to submit question');
      }
    } catch (err) {
      console.error('Submit question error:', err);
      alert('An error occurred while submitting your question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/support/questions/${activeQuestion.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setReplyText('');
        // Refresh active question details
        const updatedRes = await fetch(`/api/support/questions/${activeQuestion.id}`);
        const updatedData = await updatedRes.json();
        setActiveQuestion(updatedData);
        fetchMyQuestions();
      } else {
        alert(data.error || 'Failed to send reply');
      }
    } catch (err) {
      console.error('Send reply error:', err);
      alert('Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 font-['Inter'] flex justify-center overflow-y-auto w-full">
      <div className="w-full max-w-7xl bg-white border-2 border-[#5c0099] rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col gap-8 sm:gap-12 shadow-sm relative">
        
        <button 
          onClick={() => navigate('/customer/settings')}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-10 md:left-10 flex items-center gap-2 text-gray-500 hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer font-semibold"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="border-b border-gray-200 pb-4 sm:pb-5 text-center mt-8 sm:mt-10 md:mt-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#bd00ff] m-0 border-none">Help & Support</h2>
          <p className="text-gray-500 m-0 mt-2 font-medium text-sm sm:text-base px-2">Find answers to common questions or reach out directly to our store branches.</p>
        </div>

        {/* 1. Frequently Asked Questions Section */}
        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 border-none m-0">Frequently Asked Questions</h3>
            <span className="text-xs text-gray-400 font-semibold">General Store FAQs</span>
          </div>
          
          <div className="flex flex-col gap-3 sm:gap-4">
            {faqs.map(faq => (
              <div 
                key={faq.id} 
                className={`border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 ${openFaq === faq.id ? 'shadow-md border-[#bd00ff]' : 'hover:border-gray-300'}`}
              >
                <div 
                  className="p-4 sm:p-5 flex justify-between items-center cursor-pointer bg-white"
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                >
                  <h4 className="font-bold text-gray-800 m-0 text-base sm:text-lg border-none leading-snug sm:leading-tight">{faq.question}</h4>
                  <ChevronDown className={`text-gray-400 shrink-0 ml-2 transition-transform duration-300 ${openFaq === faq.id ? 'rotate-180 text-[#bd00ff]' : ''}`} />
                </div>
                <div 
                  className={`overflow-hidden transition-all duration-300 ${openFaq === faq.id ? 'max-h-60 border-t border-gray-100 bg-gray-50' : 'max-h-0'}`}
                >
                  <p className="p-4 sm:p-5 m-0 text-gray-600 leading-relaxed font-medium text-sm sm:text-base whitespace-pre-wrap">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-200 w-full max-w-3xl mx-auto m-0" />

        {/* 2. Ask a Question / Contact Support Section */}
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/40 border-2 border-purple-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#bd00ff] border border-purple-200 flex items-center justify-center shadow-xs shrink-0">
                <MessageSquarePlus size={24} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 m-0 border-none">
                  Ask a Question / Contact Support
                </h3>
                <p className="text-gray-600 text-sm font-medium mt-1 m-0 leading-relaxed">
                  Have a question that isn&apos;t answered in our FAQs? Send a question directly to your selected Graphix branch.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenAskModal}
              className="px-6 py-3.5 bg-gradient-to-r from-[#bd00ff] to-[#6B21A8] hover:opacity-95 text-white font-extrabold text-sm rounded-2xl border-none cursor-pointer shadow-md shadow-purple-500/20 active:scale-95 transition-all shrink-0 flex items-center gap-2 self-stretch sm:self-auto justify-center"
            >
              <MessageSquarePlus size={18} />
              <span>Ask a Question</span>
            </button>
          </div>

          {/* 3. My Questions List */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-gray-900 m-0">My Questions</h4>
              <button 
                onClick={fetchMyQuestions}
                className="text-xs font-bold text-[#bd00ff] hover:underline bg-transparent border-none cursor-pointer p-0"
              >
                Refresh
              </button>
            </div>

            {loadingQuestions ? (
              <div className="py-8 flex justify-center items-center gap-2 text-gray-400 font-semibold text-sm">
                <Loader2 size={18} className="animate-spin text-[#bd00ff]" />
                <span>Loading your questions...</span>
              </div>
            ) : myQuestions.length === 0 ? (
              <div className="p-6 bg-gray-50/70 border border-gray-200 rounded-2xl text-center text-gray-500 font-medium text-sm">
                You haven&apos;t submitted any questions yet. Click &quot;Ask a Question&quot; above if you need assistance from our branch staff.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myQuestions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => setActiveQuestion(q)}
                    className="p-4 sm:p-5 bg-white border border-gray-200 hover:border-[#bd00ff] hover:shadow-md rounded-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 group-hover:text-[#bd00ff] transition-colors text-base truncate">
                          {q.subject}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-purple-50 text-[#bd00ff] rounded-full border border-purple-200">
                          {q.branchName} Branch
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium line-clamp-1 m-0">
                        {q.question}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border flex items-center gap-1.5 ${
                        q.status === 'Answered'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : q.status === 'Closed'
                          ? 'bg-gray-100 text-gray-500 border-gray-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          q.status === 'Answered' ? 'bg-emerald-500' : q.status === 'Closed' ? 'bg-gray-400' : 'bg-amber-500 animate-pulse'
                        }`} />
                        {q.status}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <hr className="border-gray-200 w-full max-w-3xl mx-auto m-0" />

        {/* 4. Branch-Specific Contact Us Section */}
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-gray-900 border-none m-0 flex items-center gap-2">
              <Building2 className="text-[#bd00ff]" size={22} />
              Contact Us
            </h3>
            <p className="text-sm text-gray-500 m-0">Contact our branch support teams for direct assistance, product availability, or repair inquiries.</p>
          </div>
          
          <div className="flex flex-col gap-4 sm:gap-5">
            {branches.map((branch) => (
              <div 
                key={branch.id} 
                className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex flex-col gap-4"
              >
                {/* Branch Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-[#bd00ff] flex items-center justify-center font-black text-sm shrink-0">
                      <Store size={18} />
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-extrabold text-gray-900 text-base sm:text-lg m-0 border-none">
                        {branch.name}
                      </h4>
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-[#bd00ff]" />
                        {branch.address}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 w-fit self-start sm:self-center">
                    Official Branch
                  </span>
                </div>

                {/* Email Support & Call Us Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  
                  {/* Email Support Card */}
                  <a 
                    href={`mailto:${branch.email}`} 
                    className="flex items-center p-3.5 sm:p-4 rounded-xl border border-gray-200 hover:border-[#bd00ff] hover:bg-purple-50/40 transition-all group bg-gray-50/50 cursor-pointer no-underline text-inherit"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl shadow-xs border border-gray-200 flex justify-center items-center mr-3 shrink-0 group-hover:bg-[#bd00ff] group-hover:border-[#bd00ff] transition-colors">
                      <Mail size={18} className="text-[#bd00ff] group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-800 text-xs uppercase tracking-wider group-hover:text-[#bd00ff] transition-colors">
                        Email Support
                      </span>
                      <span className="text-gray-600 text-xs sm:text-sm font-semibold truncate mt-0.5">
                        {branch.email}
                      </span>
                    </div>
                  </a>

                  {/* Call Us Card */}
                  <a 
                    href={`tel:${(branch.phone || '0967 123 4567').replace(/[^0-9+]/g, '')}`} 
                    className="flex items-center p-3.5 sm:p-4 rounded-xl border border-gray-200 hover:border-[#bd00ff] hover:bg-purple-50/40 transition-all group bg-gray-50/50 cursor-pointer no-underline text-inherit"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl shadow-xs border border-gray-200 flex justify-center items-center mr-3 shrink-0 group-hover:bg-[#bd00ff] group-hover:border-[#bd00ff] transition-colors">
                      <Phone size={18} className="text-[#bd00ff] group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-800 text-xs uppercase tracking-wider group-hover:text-[#bd00ff] transition-colors">
                        Call Us
                      </span>
                      <span className="text-gray-600 text-xs sm:text-sm font-semibold truncate mt-0.5">
                        {branch.phone}
                      </span>
                    </div>
                  </a>

                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modal 1: Ask a Question Form */}
      {isAskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {submitSuccessMsg ? (
              <div className="flex flex-col items-center text-center py-6 gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 m-0">Question Submitted</h3>
                <p className="text-gray-600 text-sm font-medium leading-relaxed m-0">
                  {submitSuccessMsg}
                </p>
                <button
                  onClick={() => setIsAskModalOpen(false)}
                  className="mt-4 px-8 py-3 bg-gradient-to-r from-[#bd00ff] to-[#6B21A8] text-white rounded-xl font-bold hover:opacity-95 transition-opacity w-full cursor-pointer border-none shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#bd00ff] flex items-center justify-center">
                      <MessageSquarePlus size={20} />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 m-0">
                      Ask a Question / Contact Support
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAskModalOpen(false)}
                    className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer border-none bg-transparent"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitQuestion} className="flex flex-col gap-4">
                  {/* Select Branch */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Select Branch <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 transition-all cursor-pointer"
                      required
                    >
                      <option value="Tagoloan">Tagoloan Branch</option>
                      <option value="Villanueva">Villanueva Branch</option>
                      <option value="Jasaan">Jasaan Branch</option>
                    </select>
                  </div>

                  {/* Subject */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Subject <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="E.g., Question about my order or repair service"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 transition-all"
                      required
                    />
                  </div>

                  {/* Your Question */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Your Question <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      placeholder="Type your question or support inquiry here in detail..."
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 transition-all resize-y"
                      required
                    />
                  </div>

                  {/* Related Order (Optional) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Related Order</span>
                      <span className="text-[11px] text-gray-400 font-normal lowercase">(optional)</span>
                    </label>
                    {customerOrders.length > 0 ? (
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 transition-all cursor-pointer"
                      >
                        <option value="">-- None / General Question --</option>
                        {customerOrders.map(order => (
                          <option key={order.id} value={order.id}>
                            Order #{order.referenceId || order.id.slice(-6)} • {order.device?.name || 'Item'} ({new Date(order.createdAt).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Enter Order or Reference ID if applicable"
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsAskModalOpen(false)}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border-none cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#bd00ff] to-[#6B21A8] text-white font-extrabold text-xs rounded-xl border-none cursor-pointer shadow-md shadow-purple-500/20 hover:opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Submit Question</span>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* Modal 2: Conversation View */}
      {activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
            
            {/* Conversation Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-gray-100">
              <div className="flex flex-col gap-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-gray-900 m-0 truncate">
                    {activeQuestion.subject}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-purple-50 text-[#bd00ff] text-xs font-bold rounded-full border border-purple-200">
                    {activeQuestion.branchName} Branch
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    activeQuestion.status === 'Answered'
                      ? 'bg-emerald-50 text-emerald-700'
                      : activeQuestion.status === 'Closed'
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {activeQuestion.status}
                  </span>
                  <span>•</span>
                  <span>Submitted {new Date(activeQuestion.createdAt).toLocaleString()}</span>
                  {activeQuestion.orderId && (
                    <>
                      <span>•</span>
                      <span>Related Order</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveQuestion(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer border-none bg-transparent shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 flex flex-col gap-4 bg-gray-50/50 rounded-2xl border border-gray-200 max-h-[380px]">
              {activeQuestion.replies && activeQuestion.replies.length > 0 ? (
                activeQuestion.replies.map((msg, idx) => {
                  const isStaff = msg.senderRole === 'ADMIN' || msg.senderRole === 'SUPER_ADMIN';
                  const isSuper = msg.senderRole === 'SUPER_ADMIN';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col gap-1 max-w-[85%] ${
                        isStaff ? 'self-start' : 'self-end items-end'
                      }`}
                    >
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[11px] font-bold text-gray-700">
                          {isSuper ? 'Super Admin' : (isStaff ? `${activeQuestion.branchName} Branch Admin` : 'You')}
                        </span>
                        {isSuper && (
                          <span className="px-1.5 py-0.2 bg-purple-100 text-[#bd00ff] text-[9px] font-black rounded">
                            SUPER ADMIN
                          </span>
                        )}
                        {isStaff && !isSuper && (
                          <span className="px-1.5 py-0.2 bg-purple-50 text-[#bd00ff] text-[9px] font-bold rounded">
                            BRANCH ADMIN
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        isStaff 
                          ? 'bg-white border border-purple-200 text-gray-900 shadow-xs' 
                          : 'bg-gradient-to-r from-[#bd00ff] to-[#7e22ce] text-white shadow-xs'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-white rounded-xl border text-sm text-gray-700">
                  {activeQuestion.question}
                </div>
              )}
            </div>

            {/* Customer Reply Input */}
            {activeQuestion.status !== 'Closed' ? (
              <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-gray-100">
                <input
                  type="text"
                  placeholder="Type a follow-up reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-[#bd00ff] transition-all"
                />
                <button
                  type="submit"
                  disabled={isSendingReply || !replyText.trim()}
                  className="px-5 py-3 bg-[#bd00ff] hover:bg-[#9c00d6] text-white rounded-xl font-bold text-sm border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {isSendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            ) : (
              <div className="p-3 bg-gray-100 rounded-xl text-center text-xs font-bold text-gray-500">
                This support inquiry has been resolved and closed.
              </div>
            )}

          </div>
        </div>
      )}

    </main>
  );
}
