import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { BuyersTable, InvestorsTable } from '../components/ContactTables'
import { api } from '../api/client'
import type { Buyer, Investor } from '../types'
import AppLayout from '../components/AppLayout'
import PromptModal from '../components/PromptModal'
import { ExportMenu } from '../components/ExportMenu'
import { BuyerDrawer } from '../components/BuyerDrawer'
import { InvestorDrawer } from '../components/InvestorDrawer'

export default function BuyersListPage() {
  const navigate = useNavigate()
  const { data, refresh, loading } = useStore()
  const [filter, setFilter] = useState<'all' | Buyer['buyerType']>('all')
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null)
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null)

  const queryParam = new URLSearchParams(window.location.search).get('q') || ''
  useEffect(() => {
    setSearch(queryParam)
  }, [queryParam])

  useEffect(() => {
    if (window.location.hash === '#investors') {
      setTimeout(() => {
        const el = document.getElementById('investors')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 300)
    }
  }, [window.location.hash, loading])

  // AI Buy Box Extractor state
  const [extractInput, setExtractInput] = useState('')
  const [extractUrl, setExtractUrl] = useState('')
  const [extractResult, setExtractResult] = useState<any>(null)
  const [extracting, setExtracting] = useState(false)

  // Custom UI Modals & Toasts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null)

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    fields: Array<{ key: string; label: string; type?: string; placeholder?: string; defaultValue?: string }>;
    submitText?: string;
    onSubmit: (values: Record<string, string>) => void;
  }>({
    isOpen: false,
    title: '',
    fields: [],
    onSubmit: () => {},
  })

  // Auto-dismiss Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function runExtraction() {
    if (!extractInput && !extractUrl) return
    setExtracting(true)
    try {
      const res = await api.extractBuyBox({ text: extractInput, url: extractUrl || undefined })
      setExtractResult(res)
      setToast({ message: 'Buy Box extracted successfully!', type: 'success' })
    } catch (e: any) {
      setToast({ message: 'Extraction failed: ' + (e.message || e), type: 'error' })
    } finally {
      setExtracting(false)
    }
  }

  function triggerApplyToNewBuyerModal() {
    if (!extractResult) return
    setModalConfig({
      isOpen: true,
      title: 'Create Buyer from AI Extraction',
      description: 'Confirm or modify the extracted contact and buy box details.',
      fields: [
        { key: 'fullName', label: 'Buyer Full Name', defaultValue: extractResult.fullName || 'AI Extracted Buyer', placeholder: 'e.g. John Doe' },
        { key: 'companyName', label: 'Company Name', defaultValue: extractResult.companyName || '', placeholder: 'e.g. Acme Holdings' },
        { key: 'phone', label: 'Phone Number', defaultValue: extractResult.phone || '', placeholder: 'e.g. 555-0199' },
        { key: 'email', label: 'Email Address', defaultValue: extractResult.email || '', placeholder: 'e.g. john@example.com', type: 'email' },
        { key: 'zillowUrl', label: 'Zillow Profile URL', defaultValue: extractUrl && extractUrl.includes('zillow.com') ? extractUrl : '', placeholder: 'e.g. https://www.zillow.com/profile/...' },
        { key: 'redfinUrl', label: 'Redfin Profile URL', defaultValue: extractUrl && extractUrl.includes('redfin.com') ? extractUrl : '', placeholder: 'e.g. https://www.redfin.com/...' },
        { key: 'realtorUrl', label: 'Realtor.com Profile URL', defaultValue: extractUrl && extractUrl.includes('realtor.com') ? extractUrl : '', placeholder: 'e.g. https://www.realtor.com/...' },
        { key: 'propstreamUrl', label: 'PropStream Link', defaultValue: extractUrl && extractUrl.includes('propstream') ? extractUrl : '', placeholder: 'e.g. PropStream URL...' },
        { key: 'batchleadsUrl', label: 'BatchLeads Link', defaultValue: extractUrl && extractUrl.includes('batchleads') ? extractUrl : '', placeholder: 'e.g. BatchLeads URL...' },
        { key: 'preferredStates', label: 'Preferred States (comma-separated)', defaultValue: (extractResult.preferredStates || []).join(', '), placeholder: 'e.g. TX, FL, GA' },
        { key: 'preferredCities', label: 'Preferred Cities (comma-separated)', defaultValue: (extractResult.preferredCities || []).join(', '), placeholder: 'e.g. Houston, Orlando' },
        { key: 'desiredPropertyTypes', label: 'Desired Property Types (comma-separated)', defaultValue: (extractResult.desiredPropertyTypes || []).join(', '), placeholder: 'e.g. Single Family, Multifamily' },
        { key: 'maxBudget', label: 'Max Budget ($)', defaultValue: extractResult.maxBudget ? String(extractResult.maxBudget) : '', placeholder: 'e.g. 500000', type: 'number' },
      ],
      submitText: 'Create Buyer',
      onSubmit: async (values) => {
        try {
          await api.createBuyer({
            fullName: values.fullName,
            companyName: values.companyName || '',
            phone: values.phone || '',
            email: values.email || '',
            buyerType: 'Cash Buyer',
            zillowUrl: values.zillowUrl || '',
            redfinUrl: values.redfinUrl || '',
            realtorUrl: values.realtorUrl || '',
            propstreamUrl: values.propstreamUrl || '',
            batchleadsUrl: values.batchleadsUrl || '',
            buyBox: {
              preferredStates: values.preferredStates ? values.preferredStates.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [],
              preferredCities: values.preferredCities ? values.preferredCities.split(',').map(c => c.trim()).filter(Boolean) : [],
              desiredPropertyTypes: (values.desiredPropertyTypes ? values.desiredPropertyTypes.split(',').map(t => t.trim()).filter(Boolean) : ['Single Family Residence (SFR)']) as any,
              maxBudget: values.maxBudget ? Number(values.maxBudget) : null,
            },
          })
          setModalConfig(prev => ({ ...prev, isOpen: false }))
          setExtractResult(null)
          setExtractInput('')
          setExtractUrl('')
          setToast({ message: 'Buyer created from AI extraction!', type: 'success' })
          refresh()
        } catch (e) {
          setToast({ message: 'Failed to create buyer', type: 'error' })
        }
      }
    })
  }

  function triggerApplyToNewInvestorModal() {
    if (!extractResult) return
    setModalConfig({
      isOpen: true,
      title: 'Create Investor from AI Extraction',
      description: 'Confirm or modify the extracted contact and buy box details.',
      fields: [
        { key: 'investorName', label: 'Investor Name', defaultValue: extractResult.fullName || 'AI Extracted Investor', placeholder: 'e.g. Sarah Smith' },
        { key: 'companyName', label: 'Company Name', defaultValue: extractResult.companyName || '', placeholder: 'e.g. Acme Holdings' },
        { key: 'phone', label: 'Phone Number', defaultValue: extractResult.phone || '', placeholder: 'e.g. 555-0188' },
        { key: 'email', label: 'Email Address', defaultValue: extractResult.email || '', placeholder: 'e.g. sarah@investments.com', type: 'email' },
        { key: 'linkedInUrl', label: 'LinkedIn Profile URL', defaultValue: extractUrl && extractUrl.includes('linkedin.com') ? extractUrl : '', placeholder: 'e.g. https://linkedin.com/in/sarah' },
        { key: 'biggerPocketsUrl', label: 'BiggerPockets Profile URL', defaultValue: extractUrl && extractUrl.includes('biggerpockets.com') ? extractUrl : '', placeholder: 'e.g. https://biggerpockets.com/users/...' },
        { key: 'facebookUrl', label: 'Facebook URL', defaultValue: extractUrl && extractUrl.includes('facebook.com') ? extractUrl : '', placeholder: 'e.g. https://facebook.com/...' },
        { key: 'twitterUrl', label: 'Twitter / X URL', defaultValue: extractUrl && (extractUrl.includes('x.com') || extractUrl.includes('twitter.com')) ? extractUrl : '', placeholder: 'e.g. https://x.com/...' },
        { key: 'instagramUrl', label: 'Instagram URL', defaultValue: extractUrl && extractUrl.includes('instagram.com') ? extractUrl : '', placeholder: 'e.g. https://instagram.com/...' },
        { key: 'connectedInvestorsUrl', label: 'Connected Investors URL', defaultValue: extractUrl && extractUrl.includes('connectedinvestors.com') ? extractUrl : '', placeholder: 'https://connectedinvestors.com/member/...' },
        { key: 'loopnetUrl', label: 'LoopNet Profile URL', defaultValue: extractUrl && extractUrl.includes('loopnet.com') ? extractUrl : '', placeholder: 'https://loopnet.com/...' },
        { key: 'crexiUrl', label: 'Crexi Profile URL', defaultValue: extractUrl && extractUrl.includes('crexi.com') ? extractUrl : '', placeholder: 'https://crexi.com/...' },
        { key: 'zillowUrl', label: 'Zillow Profile URL', defaultValue: extractUrl && extractUrl.includes('zillow.com') ? extractUrl : '', placeholder: 'e.g. https://www.zillow.com/profile/...' },
        { key: 'redfinUrl', label: 'Redfin Profile URL', defaultValue: extractUrl && extractUrl.includes('redfin.com') ? extractUrl : '', placeholder: 'e.g. https://www.redfin.com/...' },
        { key: 'realtorUrl', label: 'Realtor.com Profile URL', defaultValue: extractUrl && extractUrl.includes('realtor.com') ? extractUrl : '', placeholder: 'e.g. https://www.realtor.com/...' },
        { key: 'propstreamUrl', label: 'PropStream Link', defaultValue: extractUrl && extractUrl.includes('propstream') ? extractUrl : '', placeholder: 'e.g. PropStream URL...' },
        { key: 'batchleadsUrl', label: 'BatchLeads Link', defaultValue: extractUrl && extractUrl.includes('batchleads') ? extractUrl : '', placeholder: 'e.g. BatchLeads URL...' },
        { key: 'sourcePlatform', label: 'Source Platform', defaultValue: extractUrl && extractUrl.includes('linkedin.com') ? 'LinkedIn' : (extractUrl && extractUrl.includes('biggerpockets.com') ? 'BiggerPockets' : (extractUrl && extractUrl.includes('loopnet.com') ? 'LoopNet' : (extractUrl && extractUrl.includes('crexi.com') ? 'Crexi' : (extractUrl && extractUrl.includes('connectedinvestors.com') ? 'Connected Investors' : 'Manual')))), placeholder: 'e.g. LinkedIn, Crexi' },
        { key: 'buyBoxRaw', label: 'Raw Buy Box Text', defaultValue: extractInput || '', placeholder: 'Pasted raw text...' },
        { key: 'preferredStates', label: 'Preferred States (comma-separated)', defaultValue: (extractResult.preferredStates || []).join(', '), placeholder: 'e.g. TX, FL, GA' },
        { key: 'preferredCities', label: 'Preferred Cities (comma-separated)', defaultValue: (extractResult.preferredCities || []).join(', '), placeholder: 'e.g. Houston, Orlando' },
        { key: 'desiredPropertyTypes', label: 'Desired Property Types (comma-separated)', defaultValue: (extractResult.desiredPropertyTypes || []).join(', '), placeholder: 'e.g. Single Family, Multifamily' },
        { key: 'maxBudget', label: 'Max Budget ($)', defaultValue: extractResult.maxBudget ? String(extractResult.maxBudget) : '', placeholder: 'e.g. 1000000', type: 'number' },
        { key: 'budgetMin', label: 'Min Budget Range ($)', defaultValue: extractResult.budgetMin ? String(extractResult.budgetMin) : '', placeholder: 'e.g. 100000' },
        { key: 'budgetMax', label: 'Max Budget Range ($)', defaultValue: extractResult.budgetMax ? String(extractResult.budgetMax) : '', placeholder: 'e.g. 900000' },
        { key: 'unitRangeMin', label: 'Min Unit Count', defaultValue: extractResult.unitRangeMin ? String(extractResult.unitRangeMin) : '', placeholder: 'e.g. 5' },
        { key: 'unitRangeMax', label: 'Max Unit Count', defaultValue: extractResult.unitRangeMax ? String(extractResult.unitRangeMax) : '', placeholder: 'e.g. 50' },
        { key: 'investmentStrategy', label: 'Investment Strategy', defaultValue: extractResult.investmentStrategy || '', placeholder: 'e.g. Value-Add Multifamily, BRRRR' },
      ],
      submitText: 'Create Investor',
      onSubmit: async (values) => {
        try {
          await api.createInvestor({
            investorName: values.investorName,
            companyName: values.companyName || '',
            phone: values.phone || '',
            email: values.email || '',
            linkedInUrl: values.linkedInUrl || '',
            biggerPocketsUrl: values.biggerPocketsUrl || '',
            facebookUrl: values.facebookUrl || '',
            twitterUrl: values.twitterUrl || '',
            instagramUrl: values.instagramUrl || '',
            zillowUrl: values.zillowUrl || '',
            redfinUrl: values.redfinUrl || '',
            realtorUrl: values.realtorUrl || '',
            propstreamUrl: values.propstreamUrl || '',
            batchleadsUrl: values.batchleadsUrl || '',
            connectedInvestorsUrl: values.connectedInvestorsUrl || '',
            loopnetUrl: values.loopnetUrl || '',
            crexiUrl: values.crexiUrl || '',
            sourcePlatform: values.sourcePlatform || 'Manual',
            buyBoxRaw: values.buyBoxRaw || '',
            unitRangeMin: values.unitRangeMin ? parseInt(values.unitRangeMin, 10) : null,
            unitRangeMax: values.unitRangeMax ? parseInt(values.unitRangeMax, 10) : null,
            budgetMin: values.budgetMin ? parseFloat(values.budgetMin) : null,
            budgetMax: values.budgetMax ? parseFloat(values.budgetMax) : null,
            investmentStrategy: values.investmentStrategy || '',
            aiExtracted: true,
            buyBox: {
              preferredStates: values.preferredStates ? values.preferredStates.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [],
              preferredCities: values.preferredCities ? values.preferredCities.split(',').map(c => c.trim()).filter(Boolean) : [],
              desiredPropertyTypes: (values.desiredPropertyTypes ? values.desiredPropertyTypes.split(',').map(t => t.trim()).filter(Boolean) : ['Single Family Residence (SFR)']) as any,
              maxBudget: values.maxBudget ? Number(values.maxBudget) : null,
            },
          })
          setModalConfig(prev => ({ ...prev, isOpen: false }))
          setExtractResult(null)
          setExtractInput('')
          setExtractUrl('')
          setToast({ message: 'Investor created from AI extraction!', type: 'success' })
          refresh()
        } catch (e) {
          setToast({ message: 'Failed to create investor', type: 'error' })
        }
      }
    })
  }

  const filtered = useMemo(() => {
    let list = filter === 'all'
      ? data.buyers
      : data.buyers.filter(b => b.buyerType === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        (b.fullName || '').toLowerCase().includes(q) ||
        (b.companyName || '').toLowerCase().includes(q) ||
        (b.phone || '').toLowerCase().includes(q) ||
        (b.email || '').toLowerCase().includes(q) ||
        (Array.isArray(b.buyBox?.preferredStates) && b.buyBox.preferredStates.some((s: string) => s.toLowerCase().includes(q))) ||
        (Array.isArray(b.buyBox?.preferredCities) && b.buyBox.preferredCities.some((c: string) => c.toLowerCase().includes(q))) ||
        (Array.isArray(b.buyBox?.desiredPropertyTypes) && b.buyBox.desiredPropertyTypes.some((t: string) => t.toLowerCase().includes(q)))
      )
    }
    return list
  }, [filter, data.buyers, search])

  const filteredInvestors = useMemo(() => {
    let list = data.investors
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        (i.investorName || '').toLowerCase().includes(q) ||
        (i.companyName || '').toLowerCase().includes(q) ||
        (i.phone || '').toLowerCase().includes(q) ||
        (i.email || '').toLowerCase().includes(q) ||
        (Array.isArray(i.buyBox?.preferredStates) && i.buyBox.preferredStates.some((s: string) => s.toLowerCase().includes(q))) ||
        (Array.isArray(i.buyBox?.preferredCities) && i.buyBox.preferredCities.some((c: string) => c.toLowerCase().includes(q))) ||
        (Array.isArray(i.buyBox?.desiredPropertyTypes) && i.buyBox.desiredPropertyTypes.some((t: string) => t.toLowerCase().includes(q)))
      )
    }
    return list
  }, [data.investors, search])

  async function handleUpdate(buyer: Buyer) {
    await api.updateBuyer(buyer.id, buyer)
    await refresh()
  }

  function handleDelete(id: string) {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Buyer',
      message: 'Are you sure you want to delete this buyer? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.deleteBuyer(id)
          setToast({ message: 'Buyer deleted successfully.', type: 'success' })
          refresh()
        } catch (e) {
          setToast({ message: 'Failed to delete buyer.', type: 'error' })
        }
      }
    })
  }

  async function handleUpdateInvestor(investor: Investor) {
    await api.updateInvestor(investor.id, investor)
    await refresh()
  }

  function handleDeleteInvestor(id: string) {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Investor',
      message: 'Are you sure you want to delete this investor? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.deleteInvestor(id)
          setToast({ message: 'Investor deleted successfully.', type: 'success' })
          refresh()
        } catch (e) {
          setToast({ message: 'Failed to delete investor.', type: 'error' })
        }
      }
    })
  }

  function triggerAddBuyerModal() {
    setModalConfig({
      isOpen: true,
      title: 'Add New Cash Buyer',
      description: 'Enter contact and buy box criteria details for the new buyer.',
      fields: [
        { key: 'fullName', label: 'Buyer Full Name', placeholder: 'e.g. John Doe' },
        { key: 'companyName', label: 'Company Name', placeholder: 'e.g. Acme Holdings' },
        { key: 'phone', label: 'Phone Number', placeholder: 'e.g. 555-0199' },
        { key: 'email', label: 'Email Address', placeholder: 'e.g. john@example.com', type: 'email' },
        { key: 'zillowUrl', label: 'Zillow Profile URL', placeholder: 'e.g. https://www.zillow.com/profile/...' },
        { key: 'redfinUrl', label: 'Redfin Profile URL', placeholder: 'e.g. https://www.redfin.com/...' },
        { key: 'realtorUrl', label: 'Realtor.com Profile URL', placeholder: 'e.g. https://www.realtor.com/...' },
        { key: 'propstreamUrl', label: 'PropStream Link', placeholder: 'PropStream URL...' },
        { key: 'batchleadsUrl', label: 'BatchLeads Link', placeholder: 'BatchLeads URL...' },
        { key: 'preferredStates', label: 'Preferred States (comma-separated)', placeholder: 'e.g. TX, FL, GA' },
        { key: 'preferredCities', label: 'Preferred Cities (comma-separated)', placeholder: 'e.g. Houston, Orlando' },
        { key: 'desiredPropertyTypes', label: 'Desired Property Types (comma-separated)', placeholder: 'e.g. Single Family, Multifamily' },
        { key: 'maxBudget', label: 'Max Budget ($)', placeholder: 'e.g. 500000', type: 'number' },
      ],
      submitText: 'Create Buyer',
      onSubmit: async (values) => {
        try {
          await api.createBuyer({
            fullName: values.fullName,
            companyName: values.companyName || '',
            phone: values.phone || '',
            email: values.email || '',
            buyerType: 'Cash Buyer',
            zillowUrl: values.zillowUrl || '',
            redfinUrl: values.redfinUrl || '',
            realtorUrl: values.realtorUrl || '',
            propstreamUrl: values.propstreamUrl || '',
            batchleadsUrl: values.batchleadsUrl || '',
            buyBox: {
              preferredStates: values.preferredStates ? values.preferredStates.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [],
              preferredCities: values.preferredCities ? values.preferredCities.split(',').map(c => c.trim()).filter(Boolean) : [],
              desiredPropertyTypes: (values.desiredPropertyTypes ? values.desiredPropertyTypes.split(',').map(t => t.trim()).filter(Boolean) : ['Single Family Residence (SFR)']) as any,
              maxBudget: values.maxBudget ? Number(values.maxBudget) : null,
            },
          })
          setModalConfig(prev => ({ ...prev, isOpen: false }))
          setToast({ message: 'Buyer created successfully!', type: 'success' })
          refresh()
        } catch (e) {
          setToast({ message: 'Failed to create buyer', type: 'error' })
        }
      }
    })
  }

  function triggerAddInvestorModal() {
    setModalConfig({
      isOpen: true,
      title: 'Add New Investor',
      description: 'Enter contact, LinkedIn, and buy box criteria details for the new investor.',
      fields: [
        { key: 'investorName', label: 'Investor Full Name', placeholder: 'e.g. Sarah Smith' },
        { key: 'companyName', label: 'Company Name', placeholder: 'e.g. Sarah Capital' },
        { key: 'phone', label: 'Phone Number', placeholder: 'e.g. 555-0188' },
        { key: 'email', label: 'Email Address', placeholder: 'e.g. sarah@investments.com', type: 'email' },
        { key: 'linkedInUrl', label: 'LinkedIn Profile URL', placeholder: 'e.g. https://linkedin.com/in/sarah' },
        { key: 'biggerPocketsUrl', label: 'BiggerPockets Profile URL', placeholder: 'e.g. https://biggerpockets.com/users/...' },
        { key: 'facebookUrl', label: 'Facebook URL', placeholder: 'e.g. https://facebook.com/...' },
        { key: 'twitterUrl', label: 'Twitter / X URL', placeholder: 'e.g. https://x.com/...' },
        { key: 'instagramUrl', label: 'Instagram URL', placeholder: 'e.g. https://instagram.com/...' },
        { key: 'connectedInvestorsUrl', label: 'Connected Investors URL', placeholder: 'e.g. https://connectedinvestors.com/member/...' },
        { key: 'loopnetUrl', label: 'LoopNet Profile URL', placeholder: 'e.g. https://loopnet.com/...' },
        { key: 'crexiUrl', label: 'Crexi Profile URL', placeholder: 'e.g. https://crexi.com/...' },
        { key: 'zillowUrl', label: 'Zillow Profile URL', placeholder: 'e.g. https://www.zillow.com/profile/...' },
        { key: 'redfinUrl', label: 'Redfin Profile URL', placeholder: 'e.g. https://www.redfin.com/...' },
        { key: 'realtorUrl', label: 'Realtor.com Profile URL', placeholder: 'e.g. https://www.realtor.com/...' },
        { key: 'propstreamUrl', label: 'PropStream Link', placeholder: 'PropStream URL...' },
        { key: 'batchleadsUrl', label: 'BatchLeads Link', placeholder: 'BatchLeads URL...' },
        { key: 'sourcePlatform', label: 'Source Platform', placeholder: 'e.g. Crexi, LoopNet, LinkedIn, BiggerPockets' },
        { key: 'buyBoxRaw', label: 'Raw Buy Box Text', placeholder: 'Paste raw requirement description...' },
        { key: 'preferredStates', label: 'Preferred States (comma-separated)', placeholder: 'e.g. TX, FL, GA' },
        { key: 'preferredCities', label: 'Preferred Cities (comma-separated)', placeholder: 'e.g. Houston, Orlando' },
        { key: 'desiredPropertyTypes', label: 'Desired Property Types (comma-separated)', placeholder: 'e.g. Single Family, Multifamily' },
        { key: 'maxBudget', label: 'Max Budget ($)', placeholder: 'e.g. 1000000', type: 'number' },
        { key: 'budgetMin', label: 'Min Budget Range ($)', placeholder: 'e.g. 100000' },
        { key: 'budgetMax', label: 'Max Budget Range ($)', placeholder: 'e.g. 900000' },
        { key: 'unitRangeMin', label: 'Min Unit Count', placeholder: 'e.g. 5' },
        { key: 'unitRangeMax', label: 'Max Unit Count', placeholder: 'e.g. 50' },
        { key: 'investmentStrategy', label: 'Investment Strategy', placeholder: 'e.g. Value-Add, Buy & Hold' },
      ],
      submitText: 'Create Investor',
      onSubmit: async (values) => {
        try {
          await api.createInvestor({
            investorName: values.investorName,
            companyName: values.companyName || '',
            phone: values.phone || '',
            email: values.email || '',
            linkedInUrl: values.linkedInUrl || '',
            biggerPocketsUrl: values.biggerPocketsUrl || '',
            facebookUrl: values.facebookUrl || '',
            twitterUrl: values.twitterUrl || '',
            instagramUrl: values.instagramUrl || '',
            zillowUrl: values.zillowUrl || '',
            redfinUrl: values.redfinUrl || '',
            realtorUrl: values.realtorUrl || '',
            propstreamUrl: values.propstreamUrl || '',
            batchleadsUrl: values.batchleadsUrl || '',
            connectedInvestorsUrl: values.connectedInvestorsUrl || '',
            loopnetUrl: values.loopnetUrl || '',
            crexiUrl: values.crexiUrl || '',
            sourcePlatform: values.sourcePlatform || 'Manual',
            buyBoxRaw: values.buyBoxRaw || '',
            unitRangeMin: values.unitRangeMin ? parseInt(values.unitRangeMin, 10) : null,
            unitRangeMax: values.unitRangeMax ? parseInt(values.unitRangeMax, 10) : null,
            budgetMin: values.budgetMin ? parseFloat(values.budgetMin) : null,
            budgetMax: values.budgetMax ? parseFloat(values.budgetMax) : null,
            investmentStrategy: values.investmentStrategy || '',
            aiExtracted: false,
            buyBox: {
              preferredStates: values.preferredStates ? values.preferredStates.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [],
              preferredCities: values.preferredCities ? values.preferredCities.split(',').map(c => c.trim()).filter(Boolean) : [],
              desiredPropertyTypes: (values.desiredPropertyTypes ? values.desiredPropertyTypes.split(',').map(t => t.trim()).filter(Boolean) : ['Single Family Residence (SFR)']) as any,
              maxBudget: values.maxBudget ? Number(values.maxBudget) : null,
            },
          })
          setModalConfig(prev => ({ ...prev, isOpen: false }))
          setToast({ message: 'Investor created successfully!', type: 'success' })
          refresh()
        } catch (e) {
          setToast({ message: 'Failed to create investor', type: 'error' })
        }
      }
    })
  }

  return (
    <AppLayout title="Cash Buyers & Investors" showBack onBack={() => navigate('/dashboard')}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-black/5 shadow-sm">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A] mr-2">Filter Type:</span>
          {(['all', 'Cash Buyer', 'Fix & Flip', 'Buy & Hold', 'Multifamily Buyer', 'Commercial Buyer'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${filter === f ? 'border-[#1A3C34] bg-[#1A3C34] text-white' : 'border-black/10 bg-white hover:bg-black/5'}`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search buyers, states, cities..."
            className="rounded-2xl border border-black/10 px-4 py-2 text-sm outline-none focus:border-[#1A3C34] bg-[#F9F6F1] w-full md:w-64"
          />
          <button onClick={triggerAddBuyerModal} className="rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] px-4 py-2 text-sm font-bold text-white transition">+ Buyer</button>
          <button onClick={triggerAddInvestorModal} className="rounded-2xl bg-[#10B981] hover:bg-[#059669] px-4 py-2 text-sm font-bold text-white transition">+ Investor</button>
          <button onClick={() => refresh()} className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5">Refresh</button>
          <ExportMenu rows={filtered as any} filename="buyers-export" />
        </div>
      </div>

      {/* AI-Powered Buy Box Extraction */}
      <div className="mb-6 rounded-3xl border border-black/5 bg-white p-5">
        <div className="font-semibold mb-2 flex items-center gap-2">🤖 AI Buy Box Extractor <span className="text-xs text-emerald-600">(from LinkedIn / websites / emails)</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={extractUrl} onChange={e=>setExtractUrl(e.target.value)} placeholder="https://linkedin.com/in/investor or website" className="rounded-2xl border px-4 py-2 text-sm" />
          <input value={extractInput} onChange={e=>setExtractInput(e.target.value)} placeholder="Or paste email / profile text here..." className="rounded-2xl border px-4 py-2 text-sm" />
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={runExtraction} disabled={extracting} className="rounded-2xl bg-[#1A3C34] text-white px-5 py-2 text-sm font-semibold disabled:opacity-60">
            {extracting ? 'Extracting...' : 'Extract Buy Box with AI'}
          </button>
          {extractResult && (
            <div className="flex gap-2">
              <button onClick={triggerApplyToNewBuyerModal} className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5">Create Buyer from this</button>
              <button onClick={triggerApplyToNewInvestorModal} className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5">Create Investor from this</button>
            </div>
          )}
        </div>
        {extractResult && (
          <div className="mt-3 text-xs bg-[#F9F6F1] p-3 rounded-2xl">
            <div><strong>States:</strong> {(extractResult.preferredStates||[]).join(', ') || '—'}</div>
            <div><strong>Cities:</strong> {(extractResult.preferredCities||[]).join(', ') || '—'}</div>
            <div><strong>Types:</strong> {(extractResult.desiredPropertyTypes||[]).join(', ') || '—'}</div>
            <div><strong>Max Budget:</strong> {extractResult.maxBudget ? '$' + extractResult.maxBudget.toLocaleString() : '—'}</div>
            {extractResult.notes && <div className="mt-1 text-[#6B7280]">{extractResult.notes}</div>}
          </div>
        )}
      </div>

      {loading && <div className="py-6 text-sm text-[#6B7280]">Loading buyers…</div>}

      <div className="rounded-3xl bg-white p-1 shadow-sm">
        <BuyersTable buyers={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onOpenDrawer={setSelectedBuyer} />
      </div>

      <div className="mt-6 text-xs text-[#6B7280]">
        Edits save automatically. You can also import CSV buyers via the data tools.
      </div>

      {/* Investors section */}
      <div id="investors" className="mt-10 scroll-mt-20">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold uppercase tracking-widest text-[#8A8A8A]">Investors ({filteredInvestors.length})</div>
          <ExportMenu rows={filteredInvestors as any} filename="investors-export" />
        </div>
        <div className="rounded-3xl bg-white p-1 shadow-sm">
          <InvestorsTable investors={filteredInvestors} onUpdate={handleUpdateInvestor} onDelete={handleDeleteInvestor} onOpenDrawer={setSelectedInvestor} />
        </div>
      </div>

      {/* Custom Prompt Modal */}
      <PromptModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        description={modalConfig.description}
        fields={modalConfig.fields}
        submitText={modalConfig.submitText}
        onSubmit={modalConfig.onSubmit}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Custom Confirmation Modal */}
      {confirmConfig?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-sm scale-95 transform rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl transition-all duration-300 ease-out">
            <h3 className="text-lg font-bold text-rose-600">{confirmConfig.title}</h3>
            <p className="mt-2 text-sm text-[#6B7280]">{confirmConfig.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmConfig(null)}
                className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmConfig.onConfirm()
                  setConfirmConfig(null)
                }}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-white border border-black/10 p-4 shadow-xl transition-all duration-300">
          <span className="text-lg">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <div className="text-sm font-semibold text-slate-800">{toast.message}</div>
          <button onClick={() => setToast(null)} className="ml-2 text-xs text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {selectedBuyer && (
        <BuyerDrawer
          buyer={selectedBuyer}
          onClose={() => setSelectedBuyer(null)}
          onUpdate={handleUpdate}
        />
      )}

      {selectedInvestor && (
        <InvestorDrawer
          investor={selectedInvestor}
          onClose={() => setSelectedInvestor(null)}
          onUpdate={handleUpdateInvestor}
        />
      )}
    </AppLayout>
  )
}
